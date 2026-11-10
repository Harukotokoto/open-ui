import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo } from "react";
import { fromStoredMessages } from "@/lib/stored-messages";
import {
  deleteConversation,
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

/**
 * 会話を保存する。画面から外れたあとも完了まで走るよう、結果の処理は呼び出し側のコールバックではなくここに置く。
 * 保存できなくても会話は続けられるので、エラーはログに残すだけにする(次の保存でまるごと書き直される)。
 */
export function useSaveConversation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, messages }: { id: string; messages: unknown[] }) =>
      saveConversation(id, messages),
    onError: (error) => console.error("会話を保存できませんでした", error),
    onSettled: () => queryClient.invalidateQueries({ queryKey: historyKey }),
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
