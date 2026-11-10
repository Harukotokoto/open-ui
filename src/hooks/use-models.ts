import { useQueries, useQueryClient } from "@tanstack/react-query";
import { listModels } from "@/services/profiles";
import type { ConnectionProfile } from "@/types/bindings";

/** モデル一覧のキャッシュキー。プロファイルごとに持つ。 */
export const modelsKey = (profileId: string) => ["models", profileId] as const;

/** 全プロファイルの一覧のキー(まとめて無効にするとき)。 */
export const allModelsKey = ["models"] as const;

/** 取得したモデル一覧を新しいものとして扱う時間(5分)。 */
export const MODELS_STALE_TIME_MS = 5 * 60_000;

/**
 * 全プロファイルのモデル一覧を、並行して取得する。結果は `profiles` と同じ並び。
 * プロファイルごとに成功・失敗が分かれる(1つ失敗しても他は使える)。
 * `enabled` が偽の間は取りに行かない(メニューを開くまで通信しないため)。
 * 取得済みの一覧は5分は新しいものとして使い、期限が切れたものだけ開いたときに取り直す。
 */
export function useProfileModels(
  profiles: readonly ConnectionProfile[],
  enabled: boolean,
) {
  return useQueries({
    queries: profiles.map((profile) => ({
      queryKey: modelsKey(profile.id),
      queryFn: () => listModels(profile.id),
      enabled,
      staleTime: MODELS_STALE_TIME_MS,
      retry: false,
    })),
  });
}

/** 取得済みのモデル一覧を捨て、開いているものを取り直す(手動の更新)。 */
export function useRefreshModels() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: allModelsKey });
}
