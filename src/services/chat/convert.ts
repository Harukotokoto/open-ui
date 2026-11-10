import type { UIMessage, UIMessageChunk } from "ai";
import { attachmentIdOf, getAttachmentParts } from "@/lib/attachments";
import { getMessageText } from "@/lib/messages";
import type { ChatEvent, ChatMessage } from "@/types/bindings";

/**
 * 会話(`UIMessage`)を、Rustへ渡す形にする。
 * 思考(reasoning)など本文以外のパーツは含めない。添付は中身ではなくIDだけを渡す(中身はRustが読む)。
 * 本文も添付も無いメッセージは送らない。
 */
export function toWireMessages(messages: UIMessage[]): ChatMessage[] {
  return messages.flatMap((message) => {
    const content = getMessageText(message);
    const attachments = getAttachmentParts(message).flatMap((part) => {
      const id = attachmentIdOf(part);
      return id === undefined ? [] : [id];
    });
    if (content === "" && attachments.length === 0) return [];
    return [
      {
        role: message.role,
        content,
        ...(attachments.length > 0 ? { attachments } : {}),
      },
    ];
  });
}

/** Rust からの `ChatEvent` を、AI SDK の `UIMessageChunk` へ変換する状態機械。1リクエストにつき1つ作る。 */
export interface EventConverter {
  /** 1つのイベントを、0個以上のチャンクへ変換する。終了後のイベントは無視する。 */
  push(event: ChatEvent): UIMessageChunk[];
}

type PartKind = "text" | "reasoning";

export function createEventConverter(): EventConverter {
  let started = false;
  let finished = false;
  let open: { kind: PartKind; id: string } | null = null;
  const counters: Record<PartKind, number> = { text: 0, reasoning: 0 };

  const begin = (): UIMessageChunk[] => {
    if (started) return [];
    started = true;
    return [{ type: "start" }, { type: "start-step" }];
  };

  const closeOpen = (): UIMessageChunk[] => {
    if (!open) return [];
    const chunk: UIMessageChunk =
      open.kind === "text"
        ? { type: "text-end", id: open.id }
        : { type: "reasoning-end", id: open.id };
    open = null;
    return [chunk];
  };

  /** 本文と思考が切り替わるときは、開いている方を閉じてから開く。 */
  const delta = (kind: PartKind, text: string): UIMessageChunk[] => {
    const chunks = begin();
    if (open?.kind !== kind) {
      chunks.push(...closeOpen());
      const id = `${kind}-${counters[kind]++}`;
      open = { kind, id };
      chunks.push(
        kind === "text"
          ? { type: "text-start", id }
          : { type: "reasoning-start", id },
      );
    }
    const id = open?.id ?? "";
    chunks.push(
      kind === "text"
        ? { type: "text-delta", id, delta: text }
        : { type: "reasoning-delta", id, delta: text },
    );
    return chunks;
  };

  return {
    push(event) {
      if (finished) return [];
      switch (event.type) {
        case "delta":
          return delta("text", event.text);
        case "reasoning":
          return delta("reasoning", event.text);
        case "stats":
          // 出力の前には届かないはずだが、メッセージを始めていなければ何も作らない
          if (!started) return [];
          return [
            {
              type: "message-metadata",
              messageMetadata: {
                stats: {
                  tokens: event.tokens,
                  elapsedMs: event.elapsedMs,
                  estimated: event.estimated,
                },
              },
            },
          ];
        case "done":
          finished = true;
          return [
            ...begin(),
            ...closeOpen(),
            { type: "finish-step" },
            { type: "finish" },
          ];
        case "error":
          finished = true;
          // 何も受け取る前の失敗では、空のメッセージを作らない
          return [
            ...(started ? closeOpen() : []),
            { type: "error", errorText: event.message },
          ];
      }
    },
  };
}
