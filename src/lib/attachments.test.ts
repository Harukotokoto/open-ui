import type { UIMessage } from "ai";
import { describe, expect, it } from "vitest";
import {
  attachmentIdOf,
  formatSize,
  getAttachmentParts,
  kindLabel,
  toFilePart,
} from "./attachments";

describe("toFilePart / attachmentIdOf", () => {
  it("添付の情報を、IDだけを持つファイルパーツにする", () => {
    const part = toFilePart({
      id: "abc",
      filename: "a.png",
      mediaType: "image/png",
      kind: "image",
      size: 10,
    });

    expect(part).toEqual({
      type: "file",
      mediaType: "image/png",
      filename: "a.png",
      url: "attachment://abc",
    });
    expect(attachmentIdOf(part)).toBe("abc");
  });

  it("添付でないURLからはIDを取り出さない", () => {
    expect(
      attachmentIdOf({
        type: "file",
        mediaType: "image/png",
        url: "https://example.com/a.png",
      }),
    ).toBeUndefined();
  });
});

describe("getAttachmentParts", () => {
  it("添付のファイルパーツだけを返す", () => {
    const message: UIMessage = {
      id: "m",
      role: "user",
      parts: [
        { type: "text", text: "これ" },
        { type: "file", mediaType: "text/plain", url: "attachment://1" },
        { type: "file", mediaType: "text/plain", url: "data:text/plain,x" },
      ],
    };

    expect(getAttachmentParts(message)).toHaveLength(1);
  });
});

describe("kindLabel / formatSize", () => {
  it("メディアタイプから種類の表示名を決める", () => {
    expect(kindLabel("image/jpeg")).toBe("画像");
    expect(kindLabel("application/pdf")).toBe("PDF");
    expect(kindLabel("text/plain")).toBe("テキスト");
  });

  it("バイト数を読みやすい単位にする", () => {
    expect(formatSize(512)).toBe("512 B");
    expect(formatSize(1536)).toBe("1.5 KB");
    expect(formatSize(5 * 1024 * 1024)).toBe("5.0 MB");
  });
});
