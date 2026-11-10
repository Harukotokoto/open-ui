import type { FileUIPart, UIMessage } from "ai";
import type { AttachmentInfo } from "@/types/bindings";

/**
 * 会話に残す添付の参照のURL。中身は会話のJSONに入れず、Rustが保存した添付のIDだけを持つ。
 * Rust側(`attachments::URL_PREFIX`)と同じ値にする。
 */
export const ATTACHMENT_URL_PREFIX = "attachment://";

/** 1メッセージに付けられるファイルの最大数。Rust側(`MAX_FILES_PER_MESSAGE`)と同じ値にする。 */
export const MAX_FILES_PER_MESSAGE = 10;

/** 1ファイルの最大サイズ(バイト)。Rust側(`MAX_FILE_BYTES`)と同じ値にする。 */
export const MAX_FILE_BYTES = 10 * 1024 * 1024;

/** 添付の情報を、会話に残すファイルパーツにする。 */
export function toFilePart(info: AttachmentInfo): FileUIPart {
  return {
    type: "file",
    mediaType: info.mediaType,
    filename: info.filename,
    url: `${ATTACHMENT_URL_PREFIX}${info.id}`,
  };
}

/** ファイルパーツが指す添付のID。添付でないもの(他のURL)は `undefined`。 */
export function attachmentIdOf(part: FileUIPart): string | undefined {
  return part.url.startsWith(ATTACHMENT_URL_PREFIX)
    ? part.url.slice(ATTACHMENT_URL_PREFIX.length)
    : undefined;
}

/** メッセージが持つ添付のファイルパーツ。 */
export function getAttachmentParts(message: UIMessage): FileUIPart[] {
  return message.parts.filter(
    (part): part is FileUIPart =>
      part.type === "file" && attachmentIdOf(part) !== undefined,
  );
}

/** 画像の添付か。 */
export function isImagePart(part: FileUIPart): boolean {
  return part.mediaType.startsWith("image/");
}

/** 添付の種類の表示名(メディアタイプから)。 */
export function kindLabel(mediaType: string): string {
  if (mediaType.startsWith("image/")) return "画像";
  if (mediaType === "application/pdf") return "PDF";
  return "テキスト";
}

/** バイト数を、読みやすい単位にする。 */
export function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}
