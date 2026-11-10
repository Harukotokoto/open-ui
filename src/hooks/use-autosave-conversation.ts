import type { ChatStatus, UIMessage } from "ai";
import { useCallback, useEffect, useRef } from "react";
import { useSaveConversation } from "@/hooks/use-history";
import { toStoredMessages } from "@/lib/stored-messages";

/**
 * 会話を自動で保存する。
 *
 * 送信した直後(落ちても発言が残るように)と、返答が終わったとき(完了・停止・失敗)に、
 * その時点の会話をまるごと保存する。生成中は保存しない(文字が届くたびに書き込まないため)。
 * 画面から外れるとき(別の会話を開くなど)も、未保存の分を保存する。
 * 開いただけの会話は保存しない(更新日時が変わって、一覧の順が入れ替わらないように)。
 */
export function useAutosaveConversation(
  id: string,
  messages: UIMessage[],
  status: ChatStatus,
) {
  const { mutate } = useSaveConversation();
  const latest = useRef(messages);
  // 最後に保存した(または開いた)時点のメッセージ。配列の同一性で、変更があったかを見る
  const saved = useRef(messages);

  useEffect(() => {
    latest.current = messages;
  }, [messages]);

  const flush = useCallback(() => {
    const current = latest.current;
    if (current === saved.current || current.length === 0) return;
    saved.current = current;
    mutate({ id, messages: toStoredMessages(current) });
  }, [id, mutate]);

  // 状態の変化がまとめて反映されることがある(送信から完了まで一度に進むなど)ので、
  // 状態だけでなくメッセージの変化でも確かめる
  // biome-ignore lint/correctness/useExhaustiveDependencies: messages は「変わったら確かめ直す」ための依存
  useEffect(() => {
    if (status !== "streaming") flush();
  }, [status, messages, flush]);

  useEffect(() => flush, [flush]);
}
