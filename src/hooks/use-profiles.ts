import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { modelsKey } from "@/hooks/use-models";
import {
  addProfile,
  clearApiKey,
  getApiKeyStatus,
  getProfiles,
  removeProfile,
  selectModel,
  setActiveProfile,
  setApiKey,
  testConnection,
  updateProfile,
} from "@/services/profiles";
import type { ConnectionProfile, ProfilePreset } from "@/types/bindings";

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
      // URL・キーが変わるとモデルの一覧も変わるので、取り直す
      void queryClient.invalidateQueries({ queryKey: modelsKey(profile.id) });
    },
  });
}

/** 雛形からプロファイルを追加する。結果(追加後の一覧と新しいID)を返す。 */
export function useAddProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (preset: ProfilePreset) => addProfile(preset),
    onSuccess: ({ book }) => {
      queryClient.setQueryData(profilesKey, book);
    },
  });
}

/** プロファイルを削除する。そのキーの状態とモデル一覧のキャッシュも捨てる。 */
export function useRemoveProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (profileId: string) => removeProfile(profileId),
    onSuccess: (book, profileId) => {
      queryClient.setQueryData(profilesKey, book);
      queryClient.removeQueries({ queryKey: modelsKey(profileId) });
      queryClient.removeQueries({ queryKey: keyStatusKey(profileId) });
    },
  });
}

/** 使用中のプロファイルを切り替える。 */
export function useSetActiveProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (profileId: string) => setActiveProfile(profileId),
    onSuccess: (book) => {
      queryClient.setQueryData(profilesKey, book);
    },
  });
}

export interface SelectModelInput {
  profileId: string;
  /** `null` ならサーバーの既定 */
  model: string | null;
}

/** プロファイルのモデルを選ぶ。そのプロファイルが使用中になる。 */
export function useSelectModel() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ profileId, model }: SelectModelInput) =>
      selectModel(profileId, model),
    onSuccess: (book) => {
      queryClient.setQueryData(profilesKey, book);
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
