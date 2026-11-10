import { useChat } from "@ai-sdk/react";
import type { UIMessage } from "ai";
import { toFilePart } from "@/lib/attachments";
import { chatSessions } from "@/services/chat/sessions";
import type { AttachmentInfo } from "@/types/bindings";

interface ChatSessionOptions {
  /** 会話のID。保存先のファイル名にもなる。 */
  id: string;
  /** 開いた時点のメッセージ(保存済みの会話を開くとき)。すでに生成中の会話があれば使わない。 */
  initialMessages?: UIMessage[];
}

/**
 * 1つの会話。`useChat` を Rust 経由のチャットにつなぐ。
 * 会話そのもの(`Chat`)は `chatSessions` が持つので、画面から外れても生成は続く。
 * 止まるのは、停止を押したときと、会話を削除したときだけ。
 * 接続先は送信のたびに最新の値を使う(`useChatSessionsHost` が差し込む)。
 */
export function useChatSession({ id, initialMessages }: ChatSessionOptions) {
  const chat = useChat({ chat: chatSessions.acquire(id, initialMessages) });

  const isBusy = chat.status === "submitted" || chat.status === "streaming";

  return {
    messages: chat.messages,
    status: chat.status,
    error: chat.error,
    isBusy,
    send: (text: string, attachments: AttachmentInfo[] = []) =>
      chat.sendMessage({
        text,
        ...(attachments.length > 0
          ? { files: attachments.map(toFilePart) }
          : {}),
      }),
    stop: chat.stop,
    retry: () => chat.regenerate(),
  };
}
