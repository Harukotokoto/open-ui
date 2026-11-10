import { useChat } from "@ai-sdk/react";
import { useEffect, useRef, useState } from "react";
import { cancelChat, startChat } from "@/services/chat/ipc";
import { TauriChatTransport } from "@/services/chat/transport";

const backend = { start: startChat, cancel: cancelChat };

/**
 * 1つの会話。`useChat` を Rust 経由のチャットにつなぐ。
 * `profileId` は送信のたびに最新の値を使う(Transport を作り直さない)。
 */
export function useChatSession(profileId: string | undefined) {
  const profileIdRef = useRef(profileId);
  useEffect(() => {
    profileIdRef.current = profileId;
  }, [profileId]);

  const [transport] = useState(
    () => new TauriChatTransport(backend, () => profileIdRef.current ?? ""),
  );
  const chat = useChat({ transport });

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
