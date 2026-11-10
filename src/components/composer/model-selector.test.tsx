import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ModelSelector } from "@/components/composer/model-selector";
import { getProfiles, listModels, selectModel } from "@/services/profiles";
import type { ConnectionProfile, ProfileBook } from "@/types/bindings";

vi.mock("@/services/profiles", () => ({
  getProfiles: vi.fn(),
  listModels: vi.fn(),
  selectModel: vi.fn(),
}));

const lmStudio: ConnectionProfile = {
  id: "default",
  name: "LM Studio",
  kind: "openAiCompatible",
  baseUrl: "http://localhost:1234/v1",
  selectedModel: "qwen3",
};

const ollama: ConnectionProfile = {
  id: "p2",
  name: "Ollama",
  kind: "openAiCompatible",
  baseUrl: "http://localhost:11434/v1",
  selectedModel: null,
};

const book: ProfileBook = { activeId: "default", profiles: [lmStudio, ollama] };

const modelsByProfile: Record<string, string[]> = {
  default: ["qwen3", "gemma3"],
  p2: ["llama3", "qwen3"],
};

function renderSelector() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  render(
    <QueryClientProvider client={queryClient}>
      <ModelSelector />
    </QueryClientProvider>,
  );
}

async function openMenu(user: ReturnType<typeof userEvent.setup>) {
  await user.click(await screen.findByRole("button", { name: "モデルを選ぶ" }));
  return screen.findByRole("dialog");
}

describe("ModelSelector", () => {
  beforeEach(() => {
    vi.mocked(getProfiles).mockResolvedValue(book);
    vi.mocked(listModels)
      .mockReset()
      .mockImplementation(async (id) => modelsByProfile[id] ?? []);
    vi.mocked(selectModel).mockReset();
  });

  it("開くボタンには、使用中のプロファイルで選んでいるモデルを出し、開くまで通信しない", async () => {
    renderSelector();

    expect(
      await screen.findByRole("button", { name: "モデルを選ぶ" }),
    ).toHaveTextContent("qwen3");
    expect(listModels).not.toHaveBeenCalled();
  });

  it("モデルを選んでいなければ「モデル」と出す", async () => {
    vi.mocked(getProfiles).mockResolvedValue({
      activeId: "p2",
      profiles: [lmStudio, ollama],
    });
    renderSelector();

    expect(
      await screen.findByRole("button", { name: "モデルを選ぶ" }),
    ).toHaveTextContent("モデル");
  });

  it("開くと、全プロファイルのモデルをプロファイルごとにまとめて出す", async () => {
    renderSelector();
    const user = userEvent.setup();

    const menu = await openMenu(user);

    expect(await within(menu).findByText("gemma3")).toBeInTheDocument();
    expect(within(menu).getByText("LM Studio")).toBeInTheDocument();
    expect(within(menu).getByText("Ollama")).toBeInTheDocument();
    expect(within(menu).getByText("llama3")).toBeInTheDocument();
    expect(listModels).toHaveBeenCalledTimes(2);
    expect(listModels).toHaveBeenCalledWith("default");
    expect(listModels).toHaveBeenCalledWith("p2");
  });

  it("入力で、全プロファイルのモデルを絞り込める", async () => {
    renderSelector();
    const user = userEvent.setup();
    const menu = await openMenu(user);
    await within(menu).findByText("llama3");

    await user.type(within(menu).getByRole("combobox"), "gemma");

    expect(within(menu).getByText("gemma3")).toBeInTheDocument();
    expect(within(menu).queryByText("llama3")).not.toBeInTheDocument();
    expect(within(menu).queryByText("qwen3")).not.toBeInTheDocument();
  });

  it("プロファイル名で、そのプロファイルのモデルをまとめて絞り込める", async () => {
    renderSelector();
    const user = userEvent.setup();
    const menu = await openMenu(user);
    await within(menu).findByText("llama3");

    await user.type(within(menu).getByRole("combobox"), "ollama");

    expect(within(menu).getByText("llama3")).toBeInTheDocument();
    expect(within(menu).getByText("qwen3")).toBeInTheDocument();
    expect(within(menu).queryByText("gemma3")).not.toBeInTheDocument();
  });

  it("一致するモデルが無いときは、その旨を出す", async () => {
    renderSelector();
    const user = userEvent.setup();
    const menu = await openMenu(user);
    await within(menu).findByText("llama3");

    await user.type(within(menu).getByRole("combobox"), "zzzz");

    expect(within(menu).getByText("見つかりませんでした")).toBeInTheDocument();
  });

  it("別のプロファイルのモデルを選ぶと、そのプロファイルとモデルを保存して閉じる", async () => {
    vi.mocked(selectModel).mockResolvedValue({
      activeId: "p2",
      profiles: [lmStudio, { ...ollama, selectedModel: "llama3" }],
    });
    renderSelector();
    const user = userEvent.setup();
    const menu = await openMenu(user);

    await user.click(
      await within(menu).findByRole("option", { name: "llama3" }),
    );

    expect(selectModel).toHaveBeenCalledWith("p2", "llama3");
    expect(
      await screen.findByRole("button", { name: "モデルを選ぶ" }),
    ).toHaveTextContent("llama3");
    await vi.waitFor(() =>
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument(),
    );
  });

  it("「サーバーの既定」を選ぶと、モデルをnullにする", async () => {
    renderSelector();
    const user = userEvent.setup();
    const menu = await openMenu(user);
    await within(menu).findByText("llama3");

    const defaults = within(menu).getAllByRole("option", {
      name: "サーバーの既定",
    });
    await user.click(defaults[1]);

    expect(selectModel).toHaveBeenCalledWith("p2", null);
  });

  it("選んでいるモデルに印を付ける(使用中のプロファイルのものだけ)", async () => {
    renderSelector();
    const user = userEvent.setup();
    const menu = await openMenu(user);
    await within(menu).findByText("llama3");

    const options = within(menu).getAllByRole("option", { name: "qwen3" });

    // LM Studioのqwen3は選択中、Ollamaのqwen3は同じ名前でも選ばれていない
    expect(options[0]).toHaveAttribute("data-checked", "true");
    expect(options[1]).toHaveAttribute("data-checked", "false");
  });

  it("一部のプロファイルが失敗しても、そのグループにだけ理由と再試行を出す", async () => {
    vi.mocked(listModels).mockImplementation(async (id) => {
      if (id === "p2") throw new Error("サーバーに接続できませんでした");
      return modelsByProfile[id] ?? [];
    });
    renderSelector();
    const user = userEvent.setup();
    const menu = await openMenu(user);

    expect(
      await within(menu).findByText("モデルの一覧を取得できませんでした。"),
    ).toBeInTheDocument();
    expect(
      within(menu).getByText("サーバーに接続できませんでした"),
    ).toBeInTheDocument();
    // 他のプロファイルは通常どおり使える
    expect(within(menu).getByText("gemma3")).toBeInTheDocument();

    vi.mocked(listModels).mockImplementation(
      async (id) => modelsByProfile[id] ?? [],
    );
    await user.click(within(menu).getByRole("button", { name: "再試行" }));

    expect(await within(menu).findByText("llama3")).toBeInTheDocument();
    expect(
      within(menu).queryByText("モデルの一覧を取得できませんでした。"),
    ).not.toBeInTheDocument();
  });

  it("閉じて開き直しても、5分以内なら取得済みの一覧を使う", async () => {
    renderSelector();
    const user = userEvent.setup();
    const menu = await openMenu(user);
    await within(menu).findByText("llama3");

    await user.keyboard("{Escape}");
    await vi.waitFor(() =>
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument(),
    );
    await openMenu(user);

    expect(await screen.findByText("llama3")).toBeInTheDocument();
    expect(listModels).toHaveBeenCalledTimes(2);
  });

  it("「一覧を更新」で、取得済みの一覧を捨てて取り直す", async () => {
    renderSelector();
    const user = userEvent.setup();
    const menu = await openMenu(user);
    await within(menu).findByText("llama3");
    expect(listModels).toHaveBeenCalledTimes(2);

    await user.click(within(menu).getByRole("button", { name: "一覧を更新" }));

    await vi.waitFor(() => expect(listModels).toHaveBeenCalledTimes(4));
  });
});
