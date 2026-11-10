//! プロファイルの操作(一覧・更新・キー)をまとめた入口。`commands/` はこれを呼ぶだけにする。

use std::sync::Arc;

use serde::Serialize;
use specta::Type;

use super::book::ProfileBook;
use super::keys::{KeyStatus, ProfileKeys};
use super::model::{ConnectionProfile, is_valid_id};
use super::preset::ProfilePreset;
use crate::api::Connection;
use crate::error::AppError;
use crate::secrets::SecretStore;
use crate::settings::SettingsStore;

/// プロファイルを追加した結果。画面が、追加したものを開けるようにIDを添える。
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct ProfileAdded {
    pub book: ProfileBook,
    pub id: String,
}

/// 既存と重ならない新しいID(`p` + 時刻のナノ秒の16進。万一重なれば1つずつずらす)。
fn new_profile_id(book: &ProfileBook) -> String {
    let nanos = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map_or(0, |d| d.as_nanos());
    (0u128..)
        .map(|offset| format!("p{:x}", nanos + offset))
        .find(|id| book.find(id).is_none())
        .expect("いつかは空きが見つかる")
}

pub struct ProfileService {
    store: Arc<SettingsStore>,
    keys: ProfileKeys,
}

impl ProfileService {
    /// `store` は、画面の設定と共有する設定ファイル(ロックを共有するため、同じインスタンスを渡す)。
    pub fn new(store: Arc<SettingsStore>, secrets: Arc<dyn SecretStore>) -> Self {
        Self {
            store,
            keys: ProfileKeys::new(secrets),
        }
    }

    pub fn book(&self) -> Result<ProfileBook, AppError> {
        self.store.load()
    }

    /// 既存のプロファイルを、検査した入力で更新する。更新後の一覧を返す。
    pub fn update_profile(&self, input: &ConnectionProfile) -> Result<ProfileBook, AppError> {
        let profile = input.validated()?;
        self.store.update(|book| book.replace(profile))
    }

    /// 雛形から新しいプロファイルを末尾に追加する(使用中は変えない)。
    /// 名前は既存と重ならないようにする。追加後の一覧と、新しいプロファイルのIDを返す。
    pub fn add_profile(&self, preset: ProfilePreset) -> Result<ProfileAdded, AppError> {
        let mut id = String::new();
        let book = self.store.update(|book| {
            id = new_profile_id(book);
            let name = book.unique_name(preset.label());
            book.add(preset.profile(id.clone(), name))
        })?;
        Ok(ProfileAdded { book, id })
    }

    /// プロファイルを削除し、そのAPIキーも消す。最後の1件は削除できない。
    pub fn remove_profile(&self, profile_id: &str) -> Result<ProfileBook, AppError> {
        let book = self.store.update(|book| book.remove(profile_id))?;
        // 設定の保存に成功してから消す(キーだけ先に消えて、プロファイルが残る状態を避ける)
        self.keys.clear(profile_id);
        Ok(book)
    }

    /// 使用中のプロファイルを切り替える。
    pub fn set_active(&self, profile_id: &str) -> Result<ProfileBook, AppError> {
        self.store.update(|book| book.set_active(profile_id))
    }

    /// プロファイルのモデルを選び、そのプロファイルを使用中にする。`None` ならサーバーの既定。
    pub fn select_model(
        &self,
        profile_id: &str,
        model: Option<&str>,
    ) -> Result<ProfileBook, AppError> {
        self.store
            .update(|book| book.select_model(profile_id, model))
    }

    /// 保存済みのプロファイルに接続するための情報(キーを含む)。
    pub fn connection(&self, profile_id: &str) -> Result<Connection, AppError> {
        let book = self.store.load()?;
        let profile = book
            .find(profile_id)
            .ok_or_else(|| AppError::not_found("接続先が見つかりません"))?;
        Ok(profile.connection(&self.keys.get(profile_id)))
    }

    /// 入力中の(未保存の)プロファイルに接続するための情報。接続テスト用。
    ///
    /// `api_key` が `None` なら、保存済みのキーを使う。
    pub fn draft_connection(
        &self,
        input: &ConnectionProfile,
        api_key: Option<&str>,
    ) -> Result<Connection, AppError> {
        let profile = input.validated()?;
        let key = match api_key {
            Some(key) => key.trim().to_owned(),
            None if is_valid_id(&profile.id) => self.keys.get(&profile.id),
            None => String::new(),
        };
        Ok(profile.connection(&key))
    }

    pub fn set_key(&self, profile_id: &str, key: &str) -> Result<KeyStatus, AppError> {
        self.require_profile(profile_id)?;
        Ok(self.keys.set(profile_id, key))
    }

    pub fn clear_key(&self, profile_id: &str) -> Result<KeyStatus, AppError> {
        self.require_profile(profile_id)?;
        Ok(self.keys.clear(profile_id))
    }

    pub fn key_status(&self, profile_id: &str) -> Result<KeyStatus, AppError> {
        self.require_profile(profile_id)?;
        Ok(self.keys.status(profile_id))
    }

    /// IDが正しく、保存済みのプロファイルを指していること。
    fn require_profile(&self, profile_id: &str) -> Result<(), AppError> {
        if !is_valid_id(profile_id) || self.store.load()?.find(profile_id).is_none() {
            return Err(AppError::not_found("接続先が見つかりません"));
        }
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::error::AppErrorKind;
    use crate::secrets::testing::MemoryStore;

    fn service(dir: &std::path::Path, secrets: &MemoryStore) -> ProfileService {
        ProfileService::new(Arc::new(SettingsStore::new(dir)), Arc::new(secrets.clone()))
    }

    #[test]
    fn the_first_launch_has_the_default_profile() {
        let dir = tempfile::tempdir().unwrap();
        let service = service(dir.path(), &MemoryStore::default());

        assert_eq!(service.book().unwrap(), ProfileBook::default());
    }

    #[test]
    fn update_validates_and_persists() {
        let dir = tempfile::tempdir().unwrap();
        let service = service(dir.path(), &MemoryStore::default());
        let input = ConnectionProfile {
            name: " 自宅 ".into(),
            base_url: "http://10.0.0.2:1234/v1/".into(),
            selected_model: Some("m".into()),
            ..ConnectionProfile::lm_studio()
        };

        let book = service.update_profile(&input).unwrap();

        let saved = book.find("default").unwrap();
        assert_eq!(saved.name, "自宅");
        assert_eq!(saved.base_url, "http://10.0.0.2:1234/v1");
        assert_eq!(service.book().unwrap(), book);
    }

    #[test]
    fn an_invalid_update_is_rejected_and_nothing_is_saved() {
        let dir = tempfile::tempdir().unwrap();
        let service = service(dir.path(), &MemoryStore::default());
        let input = ConnectionProfile {
            base_url: "nope".into(),
            ..ConnectionProfile::lm_studio()
        };

        assert!(service.update_profile(&input).is_err());
        assert!(!dir.path().join("settings.json").exists());
    }

    #[test]
    fn updating_an_unknown_profile_is_not_found() {
        let dir = tempfile::tempdir().unwrap();
        let service = service(dir.path(), &MemoryStore::default());
        let input = ConnectionProfile {
            id: "other".into(),
            ..ConnectionProfile::lm_studio()
        };

        let error = service.update_profile(&input).unwrap_err();

        assert_eq!(error.kind, AppErrorKind::NotFound);
    }

    #[test]
    fn the_connection_includes_the_stored_key_and_model() {
        let dir = tempfile::tempdir().unwrap();
        let secrets = MemoryStore::default();
        let service = service(dir.path(), &secrets);
        service
            .update_profile(&ConnectionProfile {
                selected_model: Some("llama3".into()),
                ..ConnectionProfile::lm_studio()
            })
            .unwrap();
        service.set_key("default", "sk-123").unwrap();

        let connection = service.connection("default").unwrap();

        assert_eq!(connection.api_key, "sk-123");
        assert_eq!(connection.model, "llama3");
        assert_eq!(connection.base_url, "http://localhost:1234/v1");
        assert!(service.connection("missing").is_err());
    }

    #[test]
    fn keys_live_only_in_the_secret_store() {
        let dir = tempfile::tempdir().unwrap();
        let secrets = MemoryStore::default();
        let service = service(dir.path(), &secrets);
        service
            .update_profile(&ConnectionProfile::lm_studio())
            .unwrap();

        assert_eq!(
            service.set_key("default", "sk-secret").unwrap(),
            KeyStatus::Saved
        );

        assert_eq!(
            secrets.value("profile:default:api_key").as_deref(),
            Some("sk-secret")
        );
        let file = std::fs::read_to_string(dir.path().join("settings.json")).unwrap();
        assert!(!file.contains("sk-secret"), "{file}");
        assert_eq!(service.key_status("default").unwrap(), KeyStatus::Saved);
        assert_eq!(service.clear_key("default").unwrap(), KeyStatus::Unset);
        assert_eq!(secrets.value("profile:default:api_key"), None);
    }

    #[test]
    fn key_operations_reject_unknown_or_malformed_ids() {
        let dir = tempfile::tempdir().unwrap();
        let service = service(dir.path(), &MemoryStore::default());

        assert!(service.set_key("missing", "k").is_err());
        assert!(service.set_key("../x", "k").is_err());
        assert!(service.key_status("missing").is_err());
        assert!(service.clear_key("missing").is_err());
    }

    #[test]
    fn a_draft_uses_the_typed_key_or_falls_back_to_the_stored_one() {
        let dir = tempfile::tempdir().unwrap();
        let service = service(dir.path(), &MemoryStore::default());
        service
            .update_profile(&ConnectionProfile::lm_studio())
            .unwrap();
        service.set_key("default", "stored").unwrap();
        let draft = ConnectionProfile {
            base_url: "http://draft:1/v1".into(),
            ..ConnectionProfile::lm_studio()
        };

        let typed = service.draft_connection(&draft, Some(" typed ")).unwrap();
        let fallback = service.draft_connection(&draft, None).unwrap();

        assert_eq!(typed.api_key, "typed");
        assert_eq!(fallback.api_key, "stored");
        assert_eq!(typed.base_url, "http://draft:1/v1");
    }

    #[test]
    fn a_draft_with_an_invalid_url_is_rejected() {
        let dir = tempfile::tempdir().unwrap();
        let service = service(dir.path(), &MemoryStore::default());
        let draft = ConnectionProfile {
            base_url: "".into(),
            ..ConnectionProfile::lm_studio()
        };

        assert!(service.draft_connection(&draft, None).is_err());
    }

    #[test]
    fn adding_a_profile_uses_the_preset_and_a_unique_name_and_id() {
        let dir = tempfile::tempdir().unwrap();
        let service = service(dir.path(), &MemoryStore::default());

        let first = service.add_profile(ProfilePreset::Ollama).unwrap();
        let second = service.add_profile(ProfilePreset::Ollama).unwrap();

        assert_ne!(first.id, second.id);
        assert!(is_valid_id(&first.id));
        let added = second.book.find(&second.id).unwrap();
        assert_eq!(added.name, "Ollama 2");
        assert_eq!(added.base_url, "http://localhost:11434/v1");
        assert_eq!(second.book.profiles.len(), 3);
        // 追加しても使用中は変わらない
        assert_eq!(second.book.active_id, "default");
        assert_eq!(service.book().unwrap(), second.book);
    }

    #[test]
    fn removing_a_profile_deletes_its_key_too() {
        let dir = tempfile::tempdir().unwrap();
        let secrets = MemoryStore::default();
        let service = service(dir.path(), &secrets);
        let added = service.add_profile(ProfilePreset::Vllm).unwrap();
        service.set_key(&added.id, "sk-extra").unwrap();
        service.set_key("default", "sk-default").unwrap();

        let book = service.remove_profile(&added.id).unwrap();

        assert!(book.find(&added.id).is_none());
        assert_eq!(
            secrets.value(&format!("profile:{}:api_key", added.id)),
            None
        );
        assert_eq!(
            secrets.value("profile:default:api_key").as_deref(),
            Some("sk-default")
        );
    }

    #[test]
    fn the_last_profile_is_kept_together_with_its_key() {
        let dir = tempfile::tempdir().unwrap();
        let secrets = MemoryStore::default();
        let service = service(dir.path(), &secrets);
        service.set_key("default", "sk-default").unwrap();

        let error = service.remove_profile("default").unwrap_err();

        assert_eq!(error.kind, AppErrorKind::InvalidInput);
        assert_eq!(service.key_status("default").unwrap(), KeyStatus::Saved);
    }

    #[test]
    fn selecting_a_model_of_another_profile_switches_the_active_one() {
        let dir = tempfile::tempdir().unwrap();
        let service = service(dir.path(), &MemoryStore::default());
        let added = service.add_profile(ProfilePreset::LlamaCpp).unwrap();

        let book = service.select_model(&added.id, Some("qwen3")).unwrap();

        assert_eq!(book.active_id, added.id);
        assert_eq!(
            book.find(&added.id).unwrap().selected_model.as_deref(),
            Some("qwen3")
        );
        assert_eq!(service.book().unwrap(), book);
        assert_eq!(
            service.connection(&added.id).unwrap().model,
            "qwen3".to_owned()
        );
    }

    #[test]
    fn set_active_persists_and_rejects_unknown_profiles() {
        let dir = tempfile::tempdir().unwrap();
        let service = service(dir.path(), &MemoryStore::default());
        let added = service.add_profile(ProfilePreset::Custom).unwrap();

        assert_eq!(service.set_active(&added.id).unwrap().active_id, added.id);
        assert_eq!(service.book().unwrap().active_id, added.id);
        assert_eq!(
            service.set_active("missing").unwrap_err().kind,
            AppErrorKind::NotFound
        );
    }
}
