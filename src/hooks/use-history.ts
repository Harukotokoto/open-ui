import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo } from "react";
import { fromStoredMessages } from "@/lib/stored-messages";
import {
  deleteConversation,
  generateConversationTitle,
  listHistory,
  loadConversation,
  renameConversation,
  saveConversation,
} from "@/services/history";

export const historyKey = ["history"] as const;
const conversationKey = (id: string) => ["conversation", id] as const;

/** 履歴の一覧(更新が新しい順)。 */
export function useHistoryList() {
  return useQuery({ queryKey: historyKey, queryFn: listHistory });
}

/**
 * 保存済みの会話1件。開くたびにファイルから読み直す(開いている間の編集は `useChat` が持つ)。
 * `enabled` が偽の間(まだ保存していない新しい会話)は読みに行かない。
 */
export function useConversation(id: string, enabled: boolean) {
  const query = useQuery({
    queryKey: conversationKey(id),
    queryFn: () => loadConversation(id),
    enabled,
    gcTime: 0,
    refetchOnWindowFocus: false,
    retry: false,
  });
  const messages = useMemo(
    () => (query.data ? fromStoredMessages(query.data.messages) : undefined),
    [query.data],
  );
  return { ...query, messages };
}

interface SaveVariables {
  id: string;
  messages: unknown[];
  /** 指定すると、保存できたあとにこの接続先のモデルでAIにタイトルを考えさせる。 */
  titleProfileId?: string;
}

/**
 * 会話を保存する。画面から外れたあとも完了まで走るよう、結果の処理は呼び出し側のコールバックではなくここに置く。
 * 保存できなくても会話は続けられるので、エラーはログに残すだけにする(次の保存でまるごと書き直される)。
 *
 * タイトルの生成は保存の完了を待たせない。失敗しても、保存時に付いた「最初の発言から作ったタイトル」が残る。
 */
export function useSaveConversation() {
  const queryClient = useQueryClient();
  const refreshList = () =>
    queryClient.invalidateQueries({ queryKey: historyKey });
  return useMutation({
    mutationFn: ({ id, messages }: SaveVariables) =>
      saveConversation(id, messages),
    onSuccess: (_saved, { id, titleProfileId }) => {
      if (titleProfileId === undefined) return;
      generateConversationTitle(id, titleProfileId)
        .then(refreshList)
        .catch((error) =>
          console.warn("タイトルを生成できませんでした", error),
        );
    },
    onError: (error) => console.error("会話を保存できませんでした", error),
    onSettled: refreshList,
  });
}

/** 会話の名前を変える。 */
export function useRenameConversation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, title }: { id: string; title: string }) =>
      renameConversation(id, title),
    onSettled: () => queryClient.invalidateQueries({ queryKey: historyKey }),
  });
}

/** 会話を削除する。 */
export function useDeleteConversation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteConversation(id),
    onSettled: () => queryClient.invalidateQueries({ queryKey: historyKey }),
  });
}
