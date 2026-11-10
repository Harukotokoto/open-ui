import { useCallback, useRef, useState } from "react";
import { MAX_FILES_PER_MESSAGE } from "@/lib/attachments";
import {
  addAttachmentFile,
  pickAttachments,
  removeAttachment,
} from "@/services/attachments";
import { errorMessage } from "@/services/ipc";
import type { AttachmentInfo } from "@/types/bindings";

/**
 * 入力欄で、これから送る添付の一覧。
 *
 * 選んだ(ドロップ・貼り付け・ダイアログ)ファイルは、すぐにRustが検査して保存する。
 * 送るときは `takeAll` で一覧を受け取る(保存済みのファイルは消さない。会話が参照する)。
 * 外したものは、保存したファイルも消す。送らずに閉じたものは、Rustが古くなってから掃除する。
 */
export function useAttachments(conversationId: string) {
  const [items, setItems] = useState<AttachmentInfo[]>([]);
  const [busyCount, setBusyCount] = useState(0);
  const [errors, setErrors] = useState<string[]>([]);
  // 同時に何件も選ばれたときに、上限を正しく数えるため、画面の状態とは別に最新の件数を持つ
  const count = useRef(0);

  const reserve = useCallback((wanted: number) => {
    const granted = Math.max(
      0,
      Math.min(wanted, MAX_FILES_PER_MESSAGE - count.current),
    );
    count.current += granted;
    return granted;
  }, []);

  const addErrors = useCallback((messages: string[]) => {
    if (messages.length > 0) setErrors((prev) => [...prev, ...messages]);
  }, []);

  const addFiles = useCallback(
    async (files: File[]) => {
      if (files.length === 0) return;
      const granted = reserve(files.length);
      const accepted = files.slice(0, granted);
      const failures: string[] = [];
      if (granted < files.length) {
        failures.push(
          `添付できるのは1メッセージに${MAX_FILES_PER_MESSAGE}件までです`,
        );
      }
      setBusyCount((n) => n + accepted.length);
      const results = await Promise.allSettled(
        accepted.map((file) => addAttachmentFile(conversationId, file)),
      );
      setBusyCount((n) => n - accepted.length);

      const added: AttachmentInfo[] = [];
      results.forEach((result, index) => {
        if (result.status === "fulfilled") {
          added.push(result.value);
        } else {
          count.current -= 1;
          failures.push(
            `${accepted[index]?.name ?? "ファイル"}: ${errorMessage(result.reason)}`,
          );
        }
      });
      setItems((prev) => [...prev, ...added]);
      addErrors(failures);
    },
    [conversationId, reserve, addErrors],
  );

  const pick = useCallback(async () => {
    setBusyCount((n) => n + 1);
    try {
      const { added, failed } = await pickAttachments(conversationId);
      const granted = reserve(added.length);
      const kept = added.slice(0, granted);
      const dropped = added.slice(granted);
      for (const info of dropped) {
        void removeAttachment(conversationId, info.id).catch(() => undefined);
      }
      setItems((prev) => [...prev, ...kept]);
      addErrors([
        ...failed.map(
          (f) => `${f.filename === "" ? "ファイル" : f.filename}: ${f.message}`,
        ),
        ...(dropped.length > 0
          ? [`添付できるのは1メッセージに${MAX_FILES_PER_MESSAGE}件までです`]
          : []),
      ]);
    } catch (error) {
      addErrors([errorMessage(error)]);
    } finally {
      setBusyCount((n) => n - 1);
    }
  }, [conversationId, reserve, addErrors]);

  const remove = useCallback(
    (id: string) => {
      setItems((prev) => prev.filter((item) => item.id !== id));
      count.current = Math.max(0, count.current - 1);
      void removeAttachment(conversationId, id).catch(() => undefined);
    },
    [conversationId],
  );

  /** 送るために、一覧を受け取って空にする。保存したファイルは消さない。 */
  const takeAll = useCallback(() => {
    const taken = items;
    setItems([]);
    count.current = 0;
    return taken;
  }, [items]);

  const clearErrors = useCallback(() => setErrors([]), []);

  return {
    items,
    /** 読み込み中(保存・ダイアログ)の件数があるか。 */
    busy: busyCount > 0,
    errors,
    full: items.length + busyCount >= MAX_FILES_PER_MESSAGE,
    addFiles,
    pick,
    remove,
    takeAll,
    clearErrors,
  };
}
