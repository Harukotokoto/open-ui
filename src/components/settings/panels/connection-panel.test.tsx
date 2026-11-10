import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ConnectionPanel } from "@/components/settings/panels/connection-panel";
import {
  addProfile,
  getApiKeyStatus,
  getProfiles,
  removeProfile,
  setActiveProfile,
  setApiKey,
  testConnection,
  updateProfile,
} from "@/services/profiles";
import type { ConnectionProfile, ProfileBook } from "@/types/bindings";

const lmStudio = vi.hoisted(
  (): ConnectionProfile => ({
    id: "default",
    name: "LM Studio",
    kind: "openAiCompatible",
    baseUrl: "http://localhost:1234/v1",
    selectedModel: null,
  }),
);

const ollama = vi.hoisted(
  (): ConnectionProfile => ({
    id: "p2",
    name: "Ollama",
    kind: "openAiCompatible",
    baseUrl: "http://localhost:11434/v1",
    selectedModel: "qwen3",
  }),
);

function bookOf(
  profiles: ConnectionProfile[],
  activeId = "default",
): ProfileBook {
  return { profiles, activeId };
}

vi.mock("@/services/profiles", () => ({
  getProfiles: vi.fn(),
  getApiKeyStatus: vi.fn(),
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

/** カード(名前で探す)を開き、編集フォームを出す。 */
async function openEditor(
  user: ReturnType<typeof userEvent.setup>,
  name: string,
) {
  const card = await screen.findByRole("group", { name });
  await user.click(within(card).getByRole("button", { name: "編集" }));
  return card;
}

describe("ConnectionPanel", () => {
  beforeEach(() => {
    vi.mocked(getProfiles).mockResolvedValue(bookOf([lmStudio]));
    vi.mocked(getApiKeyStatus).mockResolvedValue("unset");
    vi.mocked(updateProfile).mockResolvedValue(bookOf([lmStudio]));
    vi.mocked(setApiKey).mockResolvedValue("saved");
    vi.mocked(testConnection).mockReset();
    vi.mocked(addProfile).mockReset();
    vi.mocked(removeProfile).mockReset();
    vi.mocked(setActiveProfile).mockReset();
  });

  it("接続先をカードで並べ、使用中のものに印を付ける", async () => {
    vi.mocked(getProfiles).mockResolvedValue(bookOf([lmStudio, ollama]));
    renderPanel();

    const first = await screen.findByRole("group", { name: "LM Studio" });
    const second = screen.getByRole("group", { name: "Ollama" });

    expect(within(first).getByText("使用中")).toBeInTheDocument();
    expect(
      within(first).getByText("http://localhost:1234/v1"),
    ).toBeInTheDocument();
    expect(within(second).queryByText("使用中")).not.toBeInTheDocument();
    expect(
      within(second).getByRole("button", { name: "使用する" }),
    ).toBeInTheDocument();
    // 編集を開くまで、フォームは出さない
    expect(screen.queryByLabelText("ベースURL")).not.toBeInTheDocument();
  });

  it("編集を開くと保存済みの内容を表示し、キーの値は表示しない", async () => {
    vi.mocked(getApiKeyStatus).mockResolvedValue("saved");
    renderPanel();
    const user = userEvent.setup();

    await openEditor(user, "LM Studio");

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
    await openEditor(user, "LM Studio");

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
    await openEditor(user, "LM Studio");

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
    await openEditor(user, "LM Studio");

    await user.type(await screen.findByLabelText("APIキー"), "sk-secret");
    await user.type(screen.getByLabelText("モデル名"), "qwen3");
    await user.click(screen.getByRole("button", { name: "保存" }));

    expect(await screen.findByText("保存しました")).toBeInTheDocument();
    expect(updateProfile).toHaveBeenCalledWith(
      expect.objectContaining({ id: "default", selectedModel: "qwen3" }),
    );
    expect(setApiKey).toHaveBeenCalledWith("default", "sk-secret");
  });

  it("「閉じる」で編集フォームをたたむ", async () => {
    renderPanel();
    const user = userEvent.setup();
    const card = await openEditor(user, "LM Studio");
    await screen.findByLabelText("ベースURL");

    await user.click(
      within(card).getAllByRole("button", { name: "閉じる" })[0],
    );

    expect(screen.queryByLabelText("ベースURL")).not.toBeInTheDocument();
  });

  it("メニューから種類を選んで追加すると、追加した接続先の編集を開く", async () => {
    const added: ConnectionProfile = {
      ...ollama,
      id: "p3",
      name: "Ollama",
      selectedModel: null,
    };
    vi.mocked(addProfile).mockResolvedValue({
      book: bookOf([lmStudio, added]),
      id: "p3",
    });
    renderPanel();
    const user = userEvent.setup();

    await user.click(
      await screen.findByRole("button", { name: "接続先を追加" }),
    );
    await user.click(await screen.findByRole("menuitem", { name: /Ollama/ }));

    expect(addProfile).toHaveBeenCalledWith("ollama");
    const card = await screen.findByRole("group", { name: "Ollama" });
    expect(within(card).getByText("http://localhost:11434/v1")).toBeVisible();
    expect(await screen.findByLabelText("ベースURL")).toHaveValue(
      "http://localhost:11434/v1",
    );
  });

  it("「使用する」で使用中の接続先を切り替える", async () => {
    vi.mocked(getProfiles).mockResolvedValue(bookOf([lmStudio, ollama]));
    vi.mocked(setActiveProfile).mockResolvedValue(
      bookOf([lmStudio, ollama], "p2"),
    );
    renderPanel();
    const user = userEvent.setup();

    const card = await screen.findByRole("group", { name: "Ollama" });
    await user.click(within(card).getByRole("button", { name: "使用する" }));

    expect(setActiveProfile).toHaveBeenCalledWith("p2");
    expect(await within(card).findByText("使用中")).toBeInTheDocument();
    expect(
      within(screen.getByRole("group", { name: "LM Studio" })).queryByText(
        "使用中",
      ),
    ).not.toBeInTheDocument();
  });

  it("削除は確認してから行う", async () => {
    vi.mocked(getProfiles).mockResolvedValue(bookOf([lmStudio, ollama]));
    vi.mocked(removeProfile).mockResolvedValue(bookOf([lmStudio]));
    renderPanel();
    const user = userEvent.setup();

    await user.click(
      await screen.findByRole("button", { name: "「Ollama」を削除" }),
    );
    const dialog = await screen.findByRole("alertdialog");
    expect(within(dialog).getByText(/APIキーも消え/)).toBeInTheDocument();
    expect(removeProfile).not.toHaveBeenCalled();

    await user.click(within(dialog).getByRole("button", { name: "削除" }));

    expect(removeProfile).toHaveBeenCalledWith("p2");
    await vi.waitFor(() =>
      expect(
        screen.queryByRole("group", { name: "Ollama" }),
      ).not.toBeInTheDocument(),
    );
  });

  it("確認で「キャンセル」すると削除しない", async () => {
    vi.mocked(getProfiles).mockResolvedValue(bookOf([lmStudio, ollama]));
    renderPanel();
    const user = userEvent.setup();

    await user.click(
      await screen.findByRole("button", { name: "「Ollama」を削除" }),
    );
    await user.click(
      within(await screen.findByRole("alertdialog")).getByRole("button", {
        name: "キャンセル",
      }),
    );

    expect(removeProfile).not.toHaveBeenCalled();
    expect(screen.getByRole("group", { name: "Ollama" })).toBeInTheDocument();
  });

  it("最後の1件は削除できない", async () => {
    renderPanel();

    expect(
      await screen.findByRole("button", { name: "「LM Studio」を削除" }),
    ).toBeDisabled();
  });
});
