import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AppSidebar } from "@/components/sidebar/app-sidebar";
import { SidebarProvider } from "@/components/ui/sidebar";
import {
  deleteConversation,
  listHistory,
  renameConversation,
} from "@/services/history";
import { useConversationStore } from "@/stores/conversation-store";
import type { ConversationSummary } from "@/types/bindings";

vi.mock("@/services/history", () => ({
  listHistory: vi.fn(),
  loadConversation: vi.fn(),
  saveConversation: vi.fn(),
  renameConversation: vi.fn(),
  deleteConversation: vi.fn(),
}));

const nowSecs = () => Math.floor(Date.now() / 1000);

function summary(
  id: string,
  title: string,
  updatedAt: number,
): ConversationSummary {
  return { id, title, createdAt: updatedAt, updatedAt };
}

function renderSidebar() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <SidebarProvider>
        <AppSidebar />
      </SidebarProvider>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  vi.mocked(listHistory).mockReset();
  vi.mocked(renameConversation).mockReset();
  vi.mocked(deleteConversation).mockReset();
  useConversationStore.setState({ activeId: "draft", existing: false });
});

describe("AppSidebar", () => {
  beforeEach(() => {
    vi.mocked(listHistory).mockResolvedValue({
      conversations: [
        summary("a", "京都の旅行計画", nowSecs()),
        summary("b", "Rustの所有権", nowSecs() - 20 * 24 * 60 * 60),
      ],
      skipped: 0,
    });
  });

  it("履歴を日付ごとにまとめて出す", async () => {
    renderSidebar();

    expect(await screen.findByText("京都の旅行計画")).toBeInTheDocument();
    expect(screen.getByText("今日")).toBeInTheDocument();
    expect(screen.getByText("それ以前")).toBeInTheDocument();
    expect(screen.getByText("Rustの所有権")).toBeInTheDocument();
  });

  it("履歴がなければ、その旨を出す", async () => {
    vi.mocked(listHistory).mockResolvedValue({ conversations: [], skipped: 0 });

    renderSidebar();

    expect(await screen.findByText("履歴はまだありません")).toBeInTheDocument();
  });

  it("読めなかったファイルがあれば、件数を知らせる", async () => {
    vi.mocked(listHistory).mockResolvedValue({
      conversations: [summary("a", "京都の旅行計画", nowSecs())],
      skipped: 2,
    });

    renderSidebar();

    expect(
      await screen.findByText(/読み込めない履歴が2件あります/),
    ).toBeInTheDocument();
  });

  it("タイトルで絞り込む", async () => {
    const user = userEvent.setup();
    renderSidebar();
    await screen.findByText("京都の旅行計画");

    await user.type(screen.getByRole("searchbox"), "rust");

    expect(screen.queryByText("京都の旅行計画")).not.toBeInTheDocument();
    expect(screen.getByText("Rustの所有権")).toBeInTheDocument();

    await user.clear(screen.getByRole("searchbox"));
    await user.type(screen.getByRole("searchbox"), "なにもない");

    expect(screen.getByText("見つかりませんでした")).toBeInTheDocument();
  });

  it("履歴を選ぶと、その会話を開く", async () => {
    const user = userEvent.setup();
    renderSidebar();

    await user.click(
      await screen.findByRole("button", { name: "Rustの所有権" }),
    );

    expect(useConversationStore.getState()).toMatchObject({
      activeId: "b",
      existing: true,
    });
  });

  it("開いている会話は、現在の項目として示す", async () => {
    useConversationStore.setState({ activeId: "a", existing: true });

    renderSidebar();

    expect(
      await screen.findByRole("button", { name: "京都の旅行計画" }),
    ).toHaveAttribute("aria-current", "page");
    expect(
      screen.getByRole("button", { name: "Rustの所有権" }),
    ).not.toHaveAttribute("aria-current");
  });

  it("新規チャットで、新しい会話に切り替える", async () => {
    useConversationStore.setState({ activeId: "a", existing: true });
    const user = userEvent.setup();
    renderSidebar();

    await user.click(screen.getByRole("button", { name: "新規チャット" }));

    const state = useConversationStore.getState();
    expect(state.activeId).not.toBe("a");
    expect(state.existing).toBe(false);
  });

  it("名前を変更できる", async () => {
    vi.mocked(renameConversation).mockResolvedValue(
      summary("a", "京都の週末旅行", nowSecs()),
    );
    const user = userEvent.setup();
    renderSidebar();
    await screen.findByText("京都の旅行計画");

    await user.click(
      screen.getByRole("button", { name: "「京都の旅行計画」の操作" }),
    );
    await user.click(
      await screen.findByRole("menuitem", { name: "名前を変更" }),
    );
    const dialog = await screen.findByRole("dialog");
    const input = within(dialog).getByRole("textbox", { name: "名前" });
    expect(input).toHaveValue("京都の旅行計画");
    await user.clear(input);
    await user.type(input, "京都の週末旅行");
    await user.click(within(dialog).getByRole("button", { name: "保存" }));

    await waitFor(() =>
      expect(renameConversation).toHaveBeenCalledWith("a", "京都の週末旅行"),
    );
    await waitFor(() =>
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument(),
    );
  });

  it("名前の変更に失敗したら、理由を出してダイアログを開いたままにする", async () => {
    vi.mocked(renameConversation).mockRejectedValue(
      new Error("名前は100文字以内にしてください"),
    );
    const user = userEvent.setup();
    renderSidebar();
    await screen.findByText("京都の旅行計画");

    await user.click(
      screen.getByRole("button", { name: "「京都の旅行計画」の操作" }),
    );
    await user.click(
      await screen.findByRole("menuitem", { name: "名前を変更" }),
    );
    const dialog = await screen.findByRole("dialog");
    await user.click(within(dialog).getByRole("button", { name: "保存" }));

    expect(
      await within(dialog).findByText("名前は100文字以内にしてください"),
    ).toBeInTheDocument();
  });

  it("削除は確認してから行う", async () => {
    vi.mocked(deleteConversation).mockResolvedValue(undefined);
    const user = userEvent.setup();
    renderSidebar();
    await screen.findByText("Rustの所有権");

    await user.click(
      screen.getByRole("button", { name: "「Rustの所有権」の操作" }),
    );
    await user.click(await screen.findByRole("menuitem", { name: "削除" }));
    const dialog = await screen.findByRole("alertdialog");
    expect(deleteConversation).not.toHaveBeenCalled();
    await user.click(within(dialog).getByRole("button", { name: "削除" }));

    await waitFor(() => expect(deleteConversation).toHaveBeenCalledWith("b"));
  });

  it("開いている会話を削除したら、新しい会話に移る", async () => {
    vi.mocked(deleteConversation).mockResolvedValue(undefined);
    useConversationStore.setState({ activeId: "a", existing: true });
    const user = userEvent.setup();
    renderSidebar();
    await screen.findByText("京都の旅行計画");

    await user.click(
      screen.getByRole("button", { name: "「京都の旅行計画」の操作" }),
    );
    await user.click(await screen.findByRole("menuitem", { name: "削除" }));
    const dialog = await screen.findByRole("alertdialog");
    await user.click(within(dialog).getByRole("button", { name: "削除" }));

    await waitFor(() =>
      expect(useConversationStore.getState().activeId).not.toBe("a"),
    );
    expect(useConversationStore.getState().existing).toBe(false);
  });

  it("削除をやめれば、何も消さない", async () => {
    const user = userEvent.setup();
    renderSidebar();
    await screen.findByText("Rustの所有権");

    await user.click(
      screen.getByRole("button", { name: "「Rustの所有権」の操作" }),
    );
    await user.click(await screen.findByRole("menuitem", { name: "削除" }));
    const dialog = await screen.findByRole("alertdialog");
    await user.click(
      within(dialog).getByRole("button", { name: "キャンセル" }),
    );

    expect(deleteConversation).not.toHaveBeenCalled();
  });
});
