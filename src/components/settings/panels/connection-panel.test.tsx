import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ConnectionPanel } from "@/components/settings/panels/connection-panel";
import {
  getApiKeyStatus,
  setApiKey,
  testConnection,
  updateProfile,
} from "@/services/profiles";
import type { ProfileBook } from "@/types/bindings";

const book = vi.hoisted(
  (): ProfileBook => ({
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
);

vi.mock("@/services/profiles", () => ({
  getProfiles: vi.fn().mockResolvedValue(book),
  getApiKeyStatus: vi.fn(),
  updateProfile: vi.fn(),
  setApiKey: vi.fn(),
  clearApiKey: vi.fn(),
  testConnection: vi.fn(),
}));

function renderPanel() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  render(
    <QueryClientProvider client={queryClient}>
      <ConnectionPanel />
    </QueryClientProvider>,
  );
}

describe("ConnectionPanel", () => {
  beforeEach(() => {
    vi.mocked(getApiKeyStatus).mockResolvedValue("unset");
    vi.mocked(updateProfile).mockResolvedValue(book);
    vi.mocked(setApiKey).mockResolvedValue("saved");
    vi.mocked(testConnection).mockReset();
  });

  it("保存済みの内容を表示し、キーの値は表示しない", async () => {
    vi.mocked(getApiKeyStatus).mockResolvedValue("saved");
    renderPanel();

    expect(await screen.findByLabelText("名前")).toHaveValue("LM Studio");
    expect(screen.getByLabelText("ベースURL")).toHaveValue(
      "http://localhost:1234/v1",
    );
    expect(screen.getByLabelText("APIキー")).toHaveValue("");
  });

  it("接続を確かめると、見つかったモデルの件数を出す", async () => {
    vi.mocked(testConnection).mockResolvedValue(["qwen3", "gemma3"]);
    renderPanel();
    const user = userEvent.setup();

    await user.click(
      await screen.findByRole("button", { name: "接続を確かめる" }),
    );

    expect(
      await screen.findByText("モデルが2件見つかりました。"),
    ).toBeInTheDocument();
    expect(testConnection).toHaveBeenCalledWith(
      expect.objectContaining({ baseUrl: "http://localhost:1234/v1" }),
      null,
    );
  });

  it("接続できないときは、理由を出す", async () => {
    vi.mocked(testConnection).mockRejectedValue(
      new Error("サーバーに接続できませんでした"),
    );
    renderPanel();
    const user = userEvent.setup();

    await user.click(
      await screen.findByRole("button", { name: "接続を確かめる" }),
    );

    expect(
      await screen.findByText("サーバーに接続できませんでした"),
    ).toBeInTheDocument();
  });

  it("保存すると、プロファイルと入力したキーを送り、保存できたことを知らせる", async () => {
    renderPanel();
    const user = userEvent.setup();

    await user.type(await screen.findByLabelText("APIキー"), "sk-secret");
    await user.type(screen.getByLabelText("モデル名"), "qwen3");
    await user.click(screen.getByRole("button", { name: "保存" }));

    expect(await screen.findByText("保存しました")).toBeInTheDocument();
    expect(updateProfile).toHaveBeenCalledWith(
      expect.objectContaining({ id: "default", selectedModel: "qwen3" }),
    );
    expect(setApiKey).toHaveBeenCalledWith("default", "sk-secret");
  });
});
