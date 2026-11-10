import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { SidebarProvider } from "@/components/ui/sidebar";
import { ChatPage } from "@/pages/chat/chat-page";
import { cancelChat, startChat } from "@/services/chat/ipc";
import { chatSessions } from "@/services/chat/sessions";
import {
  generateConversationTitle,
  loadConversation,
  saveConversation,
} from "@/services/history";
import { useConversationStore } from "@/stores/conversation-store";
import type { ChatEvent } from "@/types/bindings";

vi.mock("@/services/chat/ipc", () => ({
  startChat: vi.fn(),
  cancelChat: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/services/history", () => ({
  listHistory: vi.fn().mockResolvedValue({ conversations: [], skipped: 0 }),
  loadConversation: vi.fn(),
  saveConversation: vi.fn().mockResolvedValue(null),
  renameConversation: vi.fn(),
  generateConversationTitle: vi.fn().mockResolvedValue(null),
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
  await screen.findByRole("button", { name: "モデルを選ぶ" });
  await user.type(screen.getByRole("textbox", { name: "メッセージ" }), text);
  await user.click(screen.getByRole("button", { name: "送信" }));
}

describe("ChatPage", () => {
  beforeEach(async () => {
    // 会話の置き場はアプリ全体で1つなので、テストごとに空にする
    await chatSessions.disposeAll();
    vi.mocked(cancelChat).mockClear();
    vi.mocked(startChat).mockReset();
    vi.mocked(saveConversation).mockClear();
    vi.mocked(generateConversationTitle).mockClear();
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
    // 接続先を読み込むと、入力欄にモデルの選択が出る
    expect(
      await screen.findByRole("button", { name: "モデルを選ぶ" }),
    ).toBeInTheDocument();
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
    expect(screen.getByText("1秒思考しました")).toBeInTheDocument();
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
    // 会話の途中は、1行の入力欄と注意書きに変わる
    expect(
      screen.getByText(
        "AIは間違えることがあります。回答は必ずご確認ください。",
      ),
    ).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: "メッセージ" })).toHaveAttribute(
      "rows",
      "1",
    );
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

  it("生成中に別の会話へ切り替えても、生成は途切れず、戻ると続きが見える", async () => {
    let emit: ((event: ChatEvent) => void) | undefined;
    let finish: (() => void) | undefined;
    vi.mocked(startChat).mockImplementation(
      (_request, onEvent) =>
        new Promise<void>((resolve) => {
          emit = onEvent;
          finish = resolve;
        }),
    );
    renderPage();
    await send("長い質問");
    await waitFor(() => expect(emit).toBeDefined());
    act(() => emit?.({ type: "delta", text: "考え中、" }));

    // 別の新しい会話に切り替える
    act(() =>
      useConversationStore.setState({ activeId: "chat-2", existing: false }),
    );
    expect(
      await screen.findByRole("heading", { name: "今日は何をしましょうか?" }),
    ).toBeInTheDocument();
    expect(cancelChat).not.toHaveBeenCalled();

    // 画面に無くても、生成は進み、終わったら保存される
    act(() => {
      emit?.({ type: "delta", text: "答えです" });
      emit?.({ type: "done" });
      finish?.();
    });
    await waitFor(() => {
      const last = vi.mocked(saveConversation).mock.calls.at(-1);
      expect(last?.[0]).toBe("chat-1");
      expect(last?.[1]).toHaveLength(2);
    });

    // 戻ると、ファイルを読み直さず、生成した返答が見える
    act(() =>
      useConversationStore.setState({ activeId: "chat-1", existing: true }),
    );
    expect(await screen.findByText("考え中、答えです")).toBeInTheDocument();
    expect(loadConversation).not.toHaveBeenCalled();
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
    expect(generateConversationTitle).not.toHaveBeenCalled();
  });

  it("最初の返答が終わって保存したら、AIにタイトルを考えさせる(1つの会話で1回だけ)", async () => {
    vi.mocked(startChat).mockImplementation(async (_request, onEvent) => {
      onEvent({ type: "delta", text: "やあ" });
      onEvent({ type: "done" });
    });
    renderPage();

    await send("こんにちは");
    await waitFor(() =>
      expect(generateConversationTitle).toHaveBeenCalledWith(
        "chat-1",
        "default",
      ),
    );
    // タイトルの依頼は、会話を保存したあとに出す
    const [saveOrder] = vi.mocked(saveConversation).mock.invocationCallOrder;
    const [titleOrder] = vi.mocked(generateConversationTitle).mock
      .invocationCallOrder;
    expect(titleOrder).toBeGreaterThan(saveOrder);

    await send("もう一つ質問");
    await waitFor(() =>
      expect(vi.mocked(saveConversation).mock.calls.at(-1)?.[1]).toHaveLength(
        4,
      ),
    );
    expect(generateConversationTitle).toHaveBeenCalledTimes(1);
  });

  it("タイトルの生成に失敗しても、会話はそのまま続けられる", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.mocked(generateConversationTitle).mockRejectedValueOnce(
      new Error("接続できません"),
    );
    vi.mocked(startChat).mockImplementation(async (_request, onEvent) => {
      onEvent({ type: "delta", text: "やあ" });
      onEvent({ type: "done" });
    });
    renderPage();

    await send("こんにちは");

    await waitFor(() => expect(warn).toHaveBeenCalled());
    expect(screen.getByText("やあ")).toBeInTheDocument();
    warn.mockRestore();
  });

  it("返答に失敗した会話では、タイトルを考えさせない", async () => {
    vi.mocked(startChat).mockImplementation(async (_request, onEvent) => {
      onEvent({ type: "error", message: "サーバーに接続できませんでした" });
    });
    renderPage();

    await send("やあ");

    await screen.findByText("サーバーに接続できませんでした");
    await waitFor(() => expect(saveConversation).toHaveBeenCalled());
    expect(generateConversationTitle).not.toHaveBeenCalled();
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
