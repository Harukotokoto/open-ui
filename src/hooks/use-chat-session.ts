import { useChat } from "@ai-sdk/react";
import type { UIMessage } from "ai";
import { useEffect, useRef, useState } from "react";
import { cancelChat, startChat } from "@/services/chat/ipc";
import { TauriChatTransport } from "@/services/chat/transport";

const backend = { start: startChat, cancel: cancelChat };

interface ChatSessionOptions {
  /** 会話のID。保存先のファイル名にもなる。 */
  id: string;
  /** 開いた時点のメッセージ(保存済みの会話を開くとき)。 */
  initialMessages?: UIMessage[];
}

/**
 * 1つの会話。`useChat` を Rust 経由のチャットにつなぐ。
 * `profileId` は送信のたびに最新の値を使う(Transport を作り直さない)。
 * 会話を切り替えるときは、呼び出し側が `key` で作り直す。画面から外れたら生成を止める。
 */
export function useChatSession(
  profileId: string | undefined,
  { id, initialMessages }: ChatSessionOptions,
) {
  const profileIdRef = useRef(profileId);
  useEffect(() => {
    profileIdRef.current = profileId;
  }, [profileId]);

  const [transport] = useState(
    () => new TauriChatTransport(backend, () => profileIdRef.current ?? ""),
  );
  const chat = useChat({ id, messages: initialMessages, transport });

  const stopRef = useRef(chat.stop);
  useEffect(() => {
    stopRef.current = chat.stop;
  }, [chat.stop]);
  useEffect(() => () => void stopRef.current(), []);

  const isBusy = chat.status === "submitted" || chat.status === "streaming";

  return {
    messages: chat.messages,
    status: chat.status,
    error: chat.error,
    isBusy,
    send: (text: string) => chat.sendMessage({ text }),
    stop: chat.stop,
    retry: () => chat.regenerate(),
  };
}
