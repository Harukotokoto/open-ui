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

/**
 * AIに会話のタイトルを考えさせて、付ける。付けたら更新後の要約を返す。
 * 返答がまだ無い・答えが使えない・生成中に名前を変えられた場合は、何も変えず `null`。
 * 失敗したときは例外。どちらでも、最初の発言から作ったタイトルはそのまま残る。
 */
export function generateConversationTitle(
  id: string,
  profileId: string,
): Promise<ConversationSummary | null> {
  return unwrap(commands.historyGenerateTitle(id, profileId));
}

export async function deleteConversation(id: string): Promise<void> {
  await unwrap(commands.historyDelete(id));
}
