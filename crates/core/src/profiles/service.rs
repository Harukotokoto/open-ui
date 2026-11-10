//! プロファイルの操作(一覧・更新・キー)をまとめた入口。`commands/` はこれを呼ぶだけにする。

use std::path::PathBuf;
use std::sync::Arc;

use super::book::ProfileBook;
use super::keys::{KeyStatus, ProfileKeys};
use super::model::{ConnectionProfile, is_valid_id};
use super::store::SettingsStore;
use crate::api::Connection;
use crate::error::AppError;
use crate::secrets::SecretStore;

pub struct ProfileService {
    store: SettingsStore,
    keys: ProfileKeys,
}

impl ProfileService {
    /// `data_dir` はアプリのデータディレクトリ。
    pub fn new(data_dir: impl Into<PathBuf>, secrets: Arc<dyn SecretStore>) -> Self {
        Self {
            store: SettingsStore::new(data_dir),
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
        ProfileService::new(dir, Arc::new(secrets.clone()))
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
}
