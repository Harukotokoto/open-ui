import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ChatToolbar } from "@/components/layout/chat-toolbar";
import { SidebarProvider } from "@/components/ui/sidebar";

vi.mock("@/services/history", () => ({
  listHistory: vi.fn().mockResolvedValue({
    conversations: [
      { id: "a", title: "京都の旅行計画", createdAt: 0, updatedAt: 0 },
    ],
    skipped: 0,
  }),
}));

function renderToolbar(onNewChat = vi.fn()) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  render(
    <QueryClientProvider client={queryClient}>
      <SidebarProvider>
        <ChatToolbar conversationId="a" onNewChat={onNewChat} />
      </SidebarProvider>
    </QueryClientProvider>,
  );
  return onNewChat;
}

describe("ChatToolbar", () => {
  it("開いている会話のタイトルを出す", async () => {
    renderToolbar();

    expect(await screen.findByText("京都の旅行計画")).toBeInTheDocument();
  });

  it("新規チャットを押すと、新しい会話を始める", async () => {
    const user = userEvent.setup();
    const onNewChat = renderToolbar();

    await user.click(screen.getByRole("button", { name: "新規チャット" }));

    expect(onNewChat).toHaveBeenCalledOnce();
  });
});
