import { unwrap } from "@/services/ipc";
import {
  type ConnectionProfile,
  commands,
  type KeyStatus,
  type ProfileAdded,
  type ProfileBook,
  type ProfilePreset,
} from "@/types/bindings";

/** 接続プロファイルの一覧と、使用中のプロファイル。 */
export function getProfiles(): Promise<ProfileBook> {
  return unwrap(commands.profilesGet());
}

/** 既存のプロファイルを更新する。 */
export function updateProfile(
  profile: ConnectionProfile,
): Promise<ProfileBook> {
  return unwrap(commands.profilesUpdate(profile));
}

/** 雛形から新しいプロファイルを追加する。追加後の一覧と、新しいプロファイルのIDを返す。 */
export function addProfile(preset: ProfilePreset): Promise<ProfileAdded> {
  return unwrap(commands.profilesAdd(preset));
}

/** プロファイルを削除する(APIキーも消える)。最後の1件は削除できない。 */
export function removeProfile(profileId: string): Promise<ProfileBook> {
  return unwrap(commands.profilesRemove(profileId));
}

/** 使用中のプロファイルを切り替える。 */
export function setActiveProfile(profileId: string): Promise<ProfileBook> {
  return unwrap(commands.profilesSetActive(profileId));
}

/** プロファイルのモデルを選び、そのプロファイルを使用中にする。`null` ならサーバーの既定。 */
export function selectModel(
  profileId: string,
  model: string | null,
): Promise<ProfileBook> {
  return unwrap(commands.profilesSelectModel(profileId, model));
}

/** 保存済みのプロファイルのサーバーにあるモデルのID。 */
export function listModels(profileId: string): Promise<string[]> {
  return unwrap(commands.modelsList(profileId));
}

/**
 * 入力中の内容でサーバーに接続できるか確かめ、見つかったモデルのIDを返す。何も保存しない。
 * `apiKey` が `null` なら、保存済みのキーを使う。
 */
export function testConnection(
  profile: ConnectionProfile,
  apiKey: string | null,
): Promise<string[]> {
  return unwrap(commands.connectionTest(profile, apiKey));
}

/** APIキーを設定する(空なら削除)。キーの値は、この関数の外には残さない。 */
export function setApiKey(
  profileId: string,
  value: string,
): Promise<KeyStatus> {
  return unwrap(commands.secretSet(profileId, value));
}

export function clearApiKey(profileId: string): Promise<KeyStatus> {
  return unwrap(commands.secretClear(profileId));
}

/** APIキーの状態。キーの値は取得できない。 */
export function getApiKeyStatus(profileId: string): Promise<KeyStatus> {
  return unwrap(commands.secretStatus(profileId));
}
