import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AboutPanel } from "@/components/settings/panels/about-panel";
import { checkForUpdate, installUpdate, type Update } from "@/services/updater";

vi.mock("@/services/app", () => ({
  getAppInfo: vi.fn().mockResolvedValue({ name: "open-ui", version: "0.1.1" }),
}));
vi.mock("@/services/updater", () => ({
  checkForUpdate: vi.fn(),
  installUpdate: vi.fn(),
}));

const update = {
  currentVersion: "0.1.1",
  version: "0.2.0",
} as unknown as Update;

function renderPanel() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <AboutPanel />
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  vi.mocked(checkForUpdate).mockReset();
  vi.mocked(installUpdate).mockReset();
});

describe("AboutPanel", () => {
  it("アプリのバージョンを出し、押すまで確認しない", async () => {
    renderPanel();

    expect(await screen.findByText("v0.1.1")).toBeInTheDocument();
    expect(checkForUpdate).not.toHaveBeenCalled();
  });

  it("「今すぐ確認」で最新だと分かる", async () => {
    vi.mocked(checkForUpdate).mockResolvedValue(null);
    renderPanel();

    await userEvent.click(screen.getByRole("button", { name: "今すぐ確認" }));

    expect(
      await screen.findByText("最新のバージョンです。"),
    ).toBeInTheDocument();
    expect(checkForUpdate).toHaveBeenCalledTimes(1);
  });

  it("確認に失敗したら理由を出し、もう一度確認できる", async () => {
    vi.mocked(checkForUpdate).mockRejectedValue(new Error("network"));
    renderPanel();

    await userEvent.click(screen.getByRole("button", { name: "今すぐ確認" }));

    expect(await screen.findByText(/確認できませんでした/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "今すぐ確認" })).toBeEnabled();
  });

  it("新しいバージョンがあれば、同じ場所で更新できる", async () => {
    vi.mocked(checkForUpdate).mockResolvedValue(update);
    vi.mocked(installUpdate).mockImplementation(() => new Promise(() => {}));
    renderPanel();

    await userEvent.click(screen.getByRole("button", { name: "今すぐ確認" }));
    expect(await screen.findByText(/v0\.2\.0 に更新できます/)).toBeVisible();

    await userEvent.click(
      screen.getByRole("button", { name: "更新して再起動" }),
    );

    await waitFor(() => expect(installUpdate).toHaveBeenCalled());
    expect(await screen.findByText("ダウンロード中")).toBeInTheDocument();
  });

  it("インストールに失敗したら理由を出し、もう一度試せる", async () => {
    vi.mocked(checkForUpdate).mockResolvedValue(update);
    vi.mocked(installUpdate).mockRejectedValue(new Error("署名が一致しません"));
    renderPanel();

    await userEvent.click(screen.getByRole("button", { name: "今すぐ確認" }));
    await userEvent.click(
      await screen.findByRole("button", { name: "更新して再起動" }),
    );

    expect(await screen.findByText(/署名が一致しません/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "もう一度試す" })).toBeEnabled();
  });
});
