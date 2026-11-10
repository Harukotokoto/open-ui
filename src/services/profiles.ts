import { unwrap } from "@/services/ipc";
import {
  type ConnectionProfile,
  commands,
  type KeyStatus,
  type ProfileBook,
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
