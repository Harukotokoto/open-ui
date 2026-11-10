import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ChatPage } from "@/pages/chat/chat-page";
import { startChat } from "@/services/chat/ipc";

vi.mock("@/services/chat/ipc", () => ({
  startChat: vi.fn(),
  cancelChat: vi.fn().mockResolvedValue(undefined),
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
      <ChatPage />
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
});
