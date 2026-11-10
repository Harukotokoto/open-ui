import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  addAttachmentFile,
  pickAttachments,
  removeAttachment,
} from "@/services/attachments";
import type { AttachmentInfo } from "@/types/bindings";
import { useAttachments } from "./use-attachments";

vi.mock("@/services/attachments", () => ({
  addAttachmentFile: vi.fn(),
  pickAttachments: vi.fn(),
  removeAttachment: vi.fn().mockResolvedValue(undefined),
}));

function info(id: string, filename = `${id}.txt`): AttachmentInfo {
  return { id, filename, mediaType: "text/plain", kind: "text", size: 1 };
}

function file(name: string) {
  return new File(["x"], name, { type: "text/plain" });
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(removeAttachment).mockResolvedValue(undefined);
});

describe("useAttachments", () => {
  it("ドロップされたファイルを保存して、一覧に足す", async () => {
    vi.mocked(addAttachmentFile).mockImplementation(async (_c, f) =>
      info(f.name),
    );
    const { result } = renderHook(() => useAttachments("c1"));

    await act(() => result.current.addFiles([file("a"), file("b")]));

    expect(result.current.items.map((i) => i.id)).toEqual(["a", "b"]);
    expect(addAttachmentFile).toHaveBeenCalledWith("c1", expect.any(File));
  });

  it("読み込めなかったファイルは理由を残し、他は足す", async () => {
    vi.mocked(addAttachmentFile).mockImplementation(async (_c, f) => {
      if (f.name === "bad") throw new Error("壊れています");
      return info(f.name);
    });
    const { result } = renderHook(() => useAttachments("c1"));

    await act(() => result.current.addFiles([file("ok"), file("bad")]));

    expect(result.current.items.map((i) => i.id)).toEqual(["ok"]);
    expect(result.current.errors).toEqual(["bad: 壊れています"]);
  });

  it("上限(10件)を超える分は断る", async () => {
    vi.mocked(addAttachmentFile).mockImplementation(async (_c, f) =>
      info(f.name),
    );
    const { result } = renderHook(() => useAttachments("c1"));
    const files = Array.from({ length: 12 }, (_, i) => file(`f${i}`));

    await act(() => result.current.addFiles(files));

    expect(result.current.items).toHaveLength(10);
    expect(result.current.full).toBe(true);
    expect(result.current.errors[0]).toContain("10件");
  });

  it("ダイアログで選んだものを足し、読めなかったものは理由を残す", async () => {
    vi.mocked(pickAttachments).mockResolvedValue({
      added: [info("p1")],
      failed: [{ filename: "x.bin", message: "対応していません" }],
    });
    const { result } = renderHook(() => useAttachments("c1"));

    await act(() => result.current.pick());

    expect(result.current.items.map((i) => i.id)).toEqual(["p1"]);
    expect(result.current.errors).toEqual(["x.bin: 対応していません"]);
  });

  it("外すと、一覧からも保存先からも消す", async () => {
    vi.mocked(pickAttachments).mockResolvedValue({
      added: [info("p1"), info("p2")],
      failed: [],
    });
    const { result } = renderHook(() => useAttachments("c1"));
    await act(() => result.current.pick());

    act(() => result.current.remove("p1"));

    expect(result.current.items.map((i) => i.id)).toEqual(["p2"]);
    expect(removeAttachment).toHaveBeenCalledWith("c1", "p1");
  });

  it("送るために受け取ると一覧は空になるが、保存先は消さない", async () => {
    vi.mocked(pickAttachments).mockResolvedValue({
      added: [info("p1")],
      failed: [],
    });
    const { result } = renderHook(() => useAttachments("c1"));
    await act(() => result.current.pick());

    let taken: AttachmentInfo[] = [];
    act(() => {
      taken = result.current.takeAll();
    });

    expect(taken.map((i) => i.id)).toEqual(["p1"]);
    expect(result.current.items).toEqual([]);
    expect(removeAttachment).not.toHaveBeenCalled();
  });
});
