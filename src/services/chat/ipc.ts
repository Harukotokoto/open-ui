import { Channel } from "@tauri-apps/api/core";
import { unwrap } from "@/services/ipc";
import { type ChatEvent, type ChatRequest, commands } from "@/types/bindings";

/** Rust にチャットの生成を頼む。完了・中断・失敗まで、`onEvent` にイベントが届く。 */
export function startChat(
  request: ChatRequest,
  onEvent: (event: ChatEvent) => void,
): Promise<void> {
  const channel = new Channel<ChatEvent>();
  channel.onmessage = onEvent;
  return unwrap(commands.chatStart(request, channel)).then(() => undefined);
}

/** 実行中の生成を中断する。 */
export function cancelChat(requestId: string): Promise<void> {
  return commands.chatCancel(requestId);
}
