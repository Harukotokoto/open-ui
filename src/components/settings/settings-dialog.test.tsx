import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { SettingsDialog } from "@/components/settings/settings-dialog";
import { updateGenerationSettings } from "@/services/generation-settings";
import { updateUiSettings } from "@/services/ui-settings";
import { useSettingsDialogStore } from "@/stores/settings-dialog-store";

vi.mock("@/services/ui-settings", () => ({
  getUiSettings: vi.fn().mockResolvedValue({ sidebarOpen: false }),
  updateUiSettings: vi.fn(),
}));

vi.mock("@/services/generation-settings", () => ({
  getGenerationSettings: vi.fn().mockResolvedValue({}),
  updateGenerationSettings: vi.fn(),
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
  updateProfile: vi.fn(),
  addProfile: vi.fn(),
  removeProfile: vi.fn(),
  setActiveProfile: vi.fn(),
  selectModel: vi.fn(),
  listModels: vi.fn(),
  setApiKey: vi.fn(),
  clearApiKey: vi.fn(),
  testConnection: vi.fn(),
}));

function renderDialog() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  render(
    <QueryClientProvider client={queryClient}>
      <SettingsDialog />
    </QueryClientProvider>,
  );
}

describe("SettingsDialog", () => {
  beforeEach(() => {
    vi.mocked(updateUiSettings).mockReset();
    vi.mocked(updateGenerationSettings).mockReset();
    useSettingsDialogStore.setState({ open: true, category: "general" });
  });

  it("閉じているときは何も出さない", () => {
    useSettingsDialogStore.setState({ open: false });
    renderDialog();

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("左にカテゴリ、右に選んだカテゴリの内容を出す", async () => {
    renderDialog();
    const user = userEvent.setup();

    expect(await screen.findByRole("dialog", { name: "設定" })).toBeVisible();
    expect(screen.getByRole("button", { name: "一般" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(screen.getByText("外観")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "接続" }));

    const card = await screen.findByRole("group", { name: "LM Studio" });
    expect(card).toHaveTextContent("http://localhost:1234/v1");
    expect(card).toHaveTextContent("使用中");
    expect(screen.getByRole("button", { name: "接続" })).toHaveAttribute(
      "aria-current",
      "page",
    );
  });

  it("指定したカテゴリから開く", async () => {
    useSettingsDialogStore.getState().show("generation");
    renderDialog();

    expect(await screen.findByLabelText("システムプロンプト")).toBeVisible();
  });

  it("検索で、カテゴリ名や項目名に合うカテゴリだけを残す", async () => {
    renderDialog();
    const user = userEvent.setup();
    const search = await screen.findByRole("searchbox", { name: "設定を検索" });

    await user.type(search, "temperature");

    expect(screen.getByRole("button", { name: "生成" })).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "一般" }),
    ).not.toBeInTheDocument();

    await user.clear(search);
    await user.type(search, "存在しない設定");

    expect(screen.getByText("見つかりませんでした")).toBeInTheDocument();
  });

  it("テーマを選ぶと、ほかの画面の設定を残したまま保存する", async () => {
    vi.mocked(updateUiSettings).mockResolvedValue({
      sidebarOpen: false,
      theme: "dark",
    });
    renderDialog();
    const user = userEvent.setup();

    await user.click(await screen.findByRole("button", { name: "ダーク" }));

    await waitFor(() =>
      expect(updateUiSettings).toHaveBeenCalledWith({
        sidebarOpen: false,
        theme: "dark",
      }),
    );
  });

  it("生成の設定は、入力が止まると自動で保存する", async () => {
    useSettingsDialogStore.setState({ category: "generation" });
    vi.mocked(updateGenerationSettings).mockImplementation(
      async (value) => value,
    );
    renderDialog();
    const user = userEvent.setup();

    await user.type(
      await screen.findByLabelText("システムプロンプト"),
      "簡潔に",
    );
    await user.type(screen.getByLabelText("temperature"), "0.7");

    await waitFor(
      () =>
        expect(updateGenerationSettings).toHaveBeenLastCalledWith({
          systemPrompt: "簡潔に",
          temperature: 0.7,
          maxTokens: null,
        }),
      { timeout: 3000 },
    );
  });

  it("範囲の外の値は保存せず、理由を出す", async () => {
    useSettingsDialogStore.setState({ category: "generation" });
    renderDialog();
    const user = userEvent.setup();

    await user.type(await screen.findByLabelText("temperature"), "5");
    await user.tab();

    expect(
      await screen.findByText(/temperatureは0〜2の数値/),
    ).toBeInTheDocument();
    expect(updateGenerationSettings).not.toHaveBeenCalled();
  });
});
