import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { SidebarProvider } from "@/components/ui/sidebar";
import { ChatPage } from "@/pages/chat/chat-page";
import { startChat } from "@/services/chat/ipc";
import { loadConversation, saveConversation } from "@/services/history";
import { useConversationStore } from "@/stores/conversation-store";

vi.mock("@/services/chat/ipc", () => ({
  startChat: vi.fn(),
  cancelChat: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/services/history", () => ({
  listHistory: vi.fn().mockResolvedValue({ conversations: [], skipped: 0 }),
  loadConversation: vi.fn(),
  saveConversation: vi.fn().mockResolvedValue(null),
  renameConversation: vi.fn(),
  deleteConversation: vi.fn(),
}));

vi.mock("@/services/profiles", () => ({
  getProfiles: vi.fn().mockResolvedValue({
    activeId: "default",
    profiles: [
      {
        id: "default",
        name: "LM Studio",
        kind: "openAiCompatible",
        baseUrl: "http://localhost:1234/v1",
        selectedModel: null,
      },
    ],
  }),
  getApiKeyStatus: vi.fn().mockResolvedValue("unset"),
}));

function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <SidebarProvider>
        <ChatPage />
      </SidebarProvider>
    </QueryClientProvider>,
  );
}

async function send(text: string) {
  const user = userEvent.setup();
  // 接続先の読み込みが終わるまで、送信はできない
  await screen.findByRole("button", { name: /LM Studio/ });
  await user.type(screen.getByRole("textbox", { name: "メッセージ" }), text);
  await user.click(screen.getByRole("button", { name: "送信" }));
}

describe("ChatPage", () => {
  beforeEach(() => {
    vi.mocked(startChat).mockReset();
    vi.mocked(saveConversation).mockClear();
    vi.mocked(loadConversation).mockReset();
    useConversationStore.setState({ activeId: "chat-1", existing: false });
  });

  it("会話が空のときは、挨拶と入力欄を出す", async () => {
    renderPage();

    expect(
      screen.getByRole("heading", { name: "今日は何をしましょうか?" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("textbox", { name: "メッセージ" }),
    ).toBeInTheDocument();
    expect(await screen.findByText("LM Studio")).toBeInTheDocument();
  });

  it("送信すると、発言と返答(と思考)を会話に並べる", async () => {
    vi.mocked(startChat).mockImplementation(async (_request, onEvent) => {
      onEvent({ type: "reasoning", text: "挨拶を返そう" });
      onEvent({ type: "delta", text: "こんにちは、" });
      onEvent({ type: "delta", text: "元気ですか?" });
      onEvent({ type: "done" });
    });
    renderPage();

    await send("こんにちは");

    expect(
      await screen.findByText("こんにちは、元気ですか?"),
    ).toBeInTheDocument();
    expect(screen.getByText("こんにちは")).toBeInTheDocument();
    expect(screen.getByText("思考しました")).toBeInTheDocument();
    expect(startChat).toHaveBeenCalledWith(
      expect.objectContaining({
        profileId: "default",
        messages: [{ role: "user", content: "こんにちは" }],
      }),
      expect.any(Function),
    );
    expect(
      screen.queryByRole("heading", { name: "今日は何をしましょうか?" }),
    ).not.toBeInTheDocument();
  });

  it("失敗したら、メッセージと、やり直し・接続設定の操作を出す", async () => {
    vi.mocked(startChat).mockImplementation(async (_request, onEvent) => {
      onEvent({ type: "error", message: "サーバーに接続できませんでした" });
    });
    renderPage();

    await send("やあ");

    expect(
      await screen.findByText("サーバーに接続できませんでした"),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "もう一度試す" }),
    ).toBeInTheDocument();
    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: "接続設定を開く" }),
      ).toBeInTheDocument(),
    );
  });

  it("送信すると会話を保存し、返答が終わったら返答も保存する", async () => {
    vi.mocked(startChat).mockImplementation(async (_request, onEvent) => {
      onEvent({ type: "delta", text: "やあ" });
      onEvent({ type: "done" });
    });
    renderPage();

    await send("こんにちは");

    await waitFor(() => {
      const last = vi.mocked(saveConversation).mock.calls.at(-1);
      expect(last?.[0]).toBe("chat-1");
      expect(last?.[1]).toHaveLength(2);
    });
    const saved = vi.mocked(saveConversation).mock.calls.at(-1)?.[1] as {
      role: string;
      parts: unknown[];
    }[];
    expect(saved.map((message) => message.role)).toEqual(["user", "assistant"]);
    expect(saved[1].parts).toContainEqual(
      expect.objectContaining({ type: "text", text: "やあ", state: "done" }),
    );
  });

  it("開いただけの会話は保存しない", async () => {
    vi.mocked(loadConversation).mockResolvedValue({
      id: "saved-1",
      title: "保存済み",
      createdAt: 1,
      updatedAt: 1,
      messages: [
        { id: "u1", role: "user", parts: [{ type: "text", text: "前の発言" }] },
        {
          id: "a1",
          role: "assistant",
          parts: [{ type: "text", text: "前の返答", state: "done" }],
        },
      ],
    });
    useConversationStore.setState({ activeId: "saved-1", existing: true });

    const view = renderPage();

    expect(await screen.findByText("前の返答")).toBeInTheDocument();
    expect(screen.getByText("前の発言")).toBeInTheDocument();
    view.unmount();
    expect(saveConversation).not.toHaveBeenCalled();
  });

  it("保存済みの会話を読めないときは、理由と、新しい会話に移る操作を出す", async () => {
    vi.mocked(loadConversation).mockRejectedValue(
      new Error("新しいバージョンの履歴です"),
    );
    useConversationStore.setState({ activeId: "saved-1", existing: true });
    const user = userEvent.setup();

    renderPage();

    expect(
      await screen.findByText("会話を開けませんでした"),
    ).toBeInTheDocument();
    expect(screen.getByText("新しいバージョンの履歴です")).toBeInTheDocument();
    await user.click(
      screen.getByRole("button", { name: "新しい会話を始める" }),
    );
    expect(
      await screen.findByRole("heading", { name: "今日は何をしましょうか?" }),
    ).toBeInTheDocument();
    expect(useConversationStore.getState().existing).toBe(false);
  });
});
