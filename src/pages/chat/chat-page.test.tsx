import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ChatPage } from "@/pages/chat/chat-page";

vi.mock("@/services/app", () => ({
  getAppInfo: vi.fn().mockResolvedValue({ name: "open-ui", version: "9.9.9" }),
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

describe("ChatPage", () => {
  it("見出しと、Rust から取得したバージョンを表示する", async () => {
    renderPage();

    expect(
      screen.getByRole("heading", { name: "open-ui" }),
    ).toBeInTheDocument();
    expect(await screen.findByText("open-ui v9.9.9")).toBeInTheDocument();
  });
});
