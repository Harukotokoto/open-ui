import { MAX_FILE_BYTES } from "@/lib/attachments";
import { unwrap } from "@/services/ipc";
import {
  type AttachmentImage,
  type AttachmentInfo,
  type AttachmentPick,
  commands,
} from "@/types/bindings";

/** ファイルの中身をbase64にする(`data:` URL の本体部分)。 */
function readAsBase64(file: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const url = String(reader.result);
      resolve(url.slice(url.indexOf(",") + 1));
    };
    reader.onerror = () => reject(new Error("ファイルを読み込めませんでした"));
    reader.readAsDataURL(file);
  });
}

/** 画面にドロップ・貼り付けされたファイルを保存する。 */
export async function addAttachmentFile(
  conversationId: string,
  file: File,
): Promise<AttachmentInfo> {
  // 大きすぎるものは、読み込んで送る前に断る(Rust側でも検査する)
  if (file.size > MAX_FILE_BYTES) {
    throw new Error(
      `ファイルが大きすぎます(上限は${MAX_FILE_BYTES / 1024 / 1024}MBです)`,
    );
  }
  const data = await readAsBase64(file);
  return unwrap(commands.attachmentAdd(conversationId, file.name, data));
}

/** OSのダイアログでファイルを選んで保存する。 */
export function pickAttachments(
  conversationId: string,
): Promise<AttachmentPick> {
  return unwrap(commands.attachmentPick(conversationId));
}

/** 入力欄で外した添付を消す。 */
export async function removeAttachment(
  conversationId: string,
  id: string,
): Promise<void> {
  await unwrap(commands.attachmentRemove(conversationId, id));
}

/** 画像の添付の中身(サムネイルの表示用)。 */
export function loadAttachmentImage(
  conversationId: string,
  id: string,
): Promise<AttachmentImage> {
  return unwrap(commands.attachmentImage(conversationId, id));
}
