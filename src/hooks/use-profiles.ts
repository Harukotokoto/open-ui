import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  clearApiKey,
  getApiKeyStatus,
  getProfiles,
  setApiKey,
  testConnection,
  updateProfile,
} from "@/services/profiles";
import type { ConnectionProfile } from "@/types/bindings";

const profilesKey = ["profiles"] as const;
const keyStatusKey = (profileId: string) => ["key-status", profileId] as const;

/** 保存されている接続プロファイルの一覧。 */
export function useProfiles() {
  return useQuery({ queryKey: profilesKey, queryFn: getProfiles });
}

/** 使用中のプロファイル。読み込み中は `undefined`。 */
export function useActiveProfile() {
  const query = useProfiles();
  const profile = query.data?.profiles.find(
    (candidate) => candidate.id === query.data?.activeId,
  );
  return { ...query, profile };
}

/** APIキーの有無。キーの値は取得できない。 */
export function useKeyStatus(profileId: string | undefined) {
  return useQuery({
    queryKey: keyStatusKey(profileId ?? ""),
    queryFn: () => getApiKeyStatus(profileId ?? ""),
    enabled: profileId !== undefined,
  });
}

/** APIキーをどうするか。 */
export type KeyChange =
  | { type: "keep" }
  | { type: "set"; value: string }
  | { type: "clear" };

export interface SaveConnectionInput {
  profile: ConnectionProfile;
  keyChange: KeyChange;
}

/** プロファイルを保存し、必要ならAPIキーも更新する。 */
export function useSaveConnection() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ profile, keyChange }: SaveConnectionInput) => {
      const book = await updateProfile(profile);
      if (keyChange.type === "set") {
        await setApiKey(profile.id, keyChange.value);
      } else if (keyChange.type === "clear") {
        await clearApiKey(profile.id);
      }
      return book;
    },
    onSettled: (_data, _error, { profile }) => {
      void queryClient.invalidateQueries({ queryKey: profilesKey });
      void queryClient.invalidateQueries({
        queryKey: keyStatusKey(profile.id),
      });
    },
  });
}

export interface TestConnectionInput {
  profile: ConnectionProfile;
  /** `null` なら保存済みのキーを使う */
  apiKey: string | null;
}

/** 入力中の内容で接続を確かめ、見つかったモデルのIDを返す。何も保存しない。 */
export function useTestConnection() {
  return useMutation({
    mutationFn: ({ profile, apiKey }: TestConnectionInput) =>
      testConnection(profile, apiKey),
  });
}
