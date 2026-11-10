import type { UIMessage } from "ai";

const ROLES = new Set(["system", "user", "assistant"]);

/**
 * 会話を保存する形にする。
 *
 * - パーツが空の返答(最初の一文字が届く前に止めたもの)は落とす。
 * - 生成中のまま残ったパーツ(`state: "streaming"`)は完了にする。保存した会話を開いたときに、
 *   生成中の表示にならないようにするため。
 * - JSONとして書き出せる形(`undefined` を含まない)にする。
 */
export function toStoredMessages(messages: readonly UIMessage[]): unknown[] {
  const settled = messages
    .filter(
      (message) => message.role !== "assistant" || message.parts.length > 0,
    )
    .map((message) => ({
      ...message,
      parts: message.parts.map((part) =>
        (part.type === "text" || part.type === "reasoning") &&
        part.state === "streaming"
          ? { ...part, state: "done" as const }
          : part,
      ),
    }));
  return JSON.parse(JSON.stringify(settled)) as unknown[];
}

/** アシスタントの返答に、表示できる本文(空白だけでない)があるか。 */
export function hasAssistantReply(messages: readonly UIMessage[]): boolean {
  return messages.some(
    (message) =>
      message.role === "assistant" &&
      message.parts.some(
        (part) => part.type === "text" && part.text.trim() !== "",
      ),
  );
}

function isMessage(value: unknown): value is UIMessage {
  if (typeof value !== "object" || value === null) return false;
  const message = value as Record<string, unknown>;
  return (
    typeof message.id === "string" &&
    typeof message.role === "string" &&
    ROLES.has(message.role) &&
    Array.isArray(message.parts)
  );
}

/** 保存された会話を、`useChat` の初期メッセージにする。形が合わないものは読み飛ばす。 */
export function fromStoredMessages(stored: readonly unknown[]): UIMessage[] {
  return stored.filter(isMessage);
}
