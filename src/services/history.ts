import { unwrap } from "@/services/ipc";
import {
  type Conversation,
  type ConversationSummary,
  commands,
  type HistoryListing,
} from "@/types/bindings";

/** 履歴の一覧(更新が新しい順)。メッセージは含まない。 */
export function listHistory(): Promise<HistoryListing> {
  return unwrap(commands.historyList());
}

/** 会話1件(メッセージを含む)。 */
export function loadConversation(id: string): Promise<Conversation> {
  return unwrap(commands.historyLoad(id));
}

/** 会話を保存する。メッセージが空なら何も保存されず、`null` が返る。 */
export function saveConversation(
  id: string,
  messages: unknown[],
): Promise<ConversationSummary | null> {
  return unwrap(commands.historySave({ id, messages }));
}

export function renameConversation(
  id: string,
  title: string,
): Promise<ConversationSummary> {
  return unwrap(commands.historyRename(id, title));
}

export async function deleteConversation(id: string): Promise<void> {
  await unwrap(commands.historyDelete(id));
}
