import { useChat } from "@ai-sdk/react";
import type { UIMessage } from "ai";
import { useEffect, useRef, useState } from "react";
import { toFilePart } from "@/lib/attachments";
import { buildFormatGuide } from "@/lib/markdown/custom-tags";
import { cancelChat, startChat } from "@/services/chat/ipc";
import { TauriChatTransport } from "@/services/chat/transport";
import type { AttachmentInfo } from "@/types/bindings";

const backend = { start: startChat, cancel: cancelChat };
/** 画面が描ける書式(Markdownと独自タグ)をAIに伝える説明。常に付ける。 */
const FORMAT_GUIDE = buildFormatGuide();

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
    () =>
      new TauriChatTransport(
        backend,
        () => profileIdRef.current ?? "",
        () => FORMAT_GUIDE,
      ),
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
