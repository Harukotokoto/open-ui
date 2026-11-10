//! プロファイルの保存先(`settings.json`)。
//!
//! 書き込みは一時ファイル経由のアトミック書き込み。versionの方針:
//! 後方互換の追加(任意のフィールド)ではversionを上げず、読めない変更のときだけ上げる。
//! **新しいversionのファイルは読まず、上書きもしない**(`load` が失敗するので、保存まで進まない)。

use std::path::PathBuf;
use std::sync::Mutex;

use serde::{Deserialize, Serialize};

use super::book::ProfileBook;
use crate::error::AppError;
use crate::fs::write_atomic;

/// このアプリが読み書きできるversion。
pub const SETTINGS_VERSION: u32 = 1;

const FILE_NAME: &str = "settings.json";

#[derive(Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct SettingsFile {
    version: u32,
    profile_book: ProfileBook,
}

/// `settings.json` の読み書き。読み込みと保存の間に他の書き込みが入らないよう直列化する。
pub struct SettingsStore {
    path: PathBuf,
    lock: Mutex<()>,
}

impl SettingsStore {
    /// `dir` はアプリのデータディレクトリ。
    pub fn new(dir: impl Into<PathBuf>) -> Self {
        Self {
            path: dir.into().join(FILE_NAME),
            lock: Mutex::new(()),
        }
    }

    /// 保存されているプロファイル。ファイルが無ければ初期値(保存はしない)。
    pub fn load(&self) -> Result<ProfileBook, AppError> {
        let _guard = self.guard();
        self.read()
    }

    /// 読み込み → `change` → 保存を、他の書き込みと割り込まないように行う。保存後の内容を返す。
    pub fn update(
        &self,
        change: impl FnOnce(&mut ProfileBook) -> Result<(), AppError>,
    ) -> Result<ProfileBook, AppError> {
        let _guard = self.guard();
        let mut book = self.read()?;
        change(&mut book)?;
        self.write(&book)?;
        Ok(book)
    }

    fn guard(&self) -> std::sync::MutexGuard<'_, ()> {
        self.lock
            .lock()
            .unwrap_or_else(std::sync::PoisonError::into_inner)
    }

    fn read(&self) -> Result<ProfileBook, AppError> {
        let text = match std::fs::read_to_string(&self.path) {
            Ok(text) => text,
            Err(e) if e.kind() == std::io::ErrorKind::NotFound => {
                return Ok(ProfileBook::default());
            }
            Err(e) => {
                return Err(AppError::storage(format!(
                    "設定ファイルを読み込めませんでした: {e}"
                )));
            }
        };

        let broken = || {
            AppError::storage(format!(
                "設定ファイルを解釈できません。ファイルは変更していません({})",
                self.path.display()
            ))
        };
        let value: serde_json::Value = serde_json::from_str(&text).map_err(|_| broken())?;
        let version = value["version"].as_u64().ok_or_else(broken)?;
        if version > u64::from(SETTINGS_VERSION) {
            return Err(AppError::storage(
                "新しいバージョンのアプリで作られた設定ファイルのため、読み込めません。アプリを更新してください",
            ));
        }
        let file: SettingsFile = serde_json::from_value(value).map_err(|_| broken())?;
        Ok(file.profile_book.normalized())
    }

    fn write(&self, book: &ProfileBook) -> Result<(), AppError> {
        let file = SettingsFile {
            version: SETTINGS_VERSION,
            profile_book: book.clone(),
        };
        let bytes = serde_json::to_vec_pretty(&file)
            .map_err(|e| AppError::internal(format!("設定をシリアライズできませんでした: {e}")))?;
        write_atomic(&self.path, &bytes)
            .map_err(|e| AppError::storage(format!("設定ファイルを保存できませんでした: {e}")))
    }
}

#[cfg(test)]
mod tests {
    use std::fs;

    use super::*;
    use crate::error::AppErrorKind;

    #[test]
    fn a_missing_file_gives_the_default_book_without_creating_it() {
        let dir = tempfile::tempdir().unwrap();
        let store = SettingsStore::new(dir.path());

        assert_eq!(store.load().unwrap(), ProfileBook::default());
        assert!(!dir.path().join("settings.json").exists());
    }

    #[test]
    fn updates_are_saved_and_read_back() {
        let dir = tempfile::tempdir().unwrap();
        let store = SettingsStore::new(dir.path());

        let saved = store
            .update(|book| {
                book.profiles[0].name = "自宅".into();
                Ok(())
            })
            .unwrap();

        assert_eq!(saved.profiles[0].name, "自宅");
        // 別のインスタンスで読み直しても同じ
        assert_eq!(SettingsStore::new(dir.path()).load().unwrap(), saved);
    }

    #[test]
    fn the_file_has_a_version_and_no_secrets() {
        let dir = tempfile::tempdir().unwrap();
        let store = SettingsStore::new(dir.path());
        store.update(|_| Ok(())).unwrap();

        let text = fs::read_to_string(dir.path().join("settings.json")).unwrap();

        assert!(text.contains("\"version\": 1"), "{text}");
        assert!(!text.to_ascii_lowercase().contains("apikey"), "{text}");
        assert!(!text.to_ascii_lowercase().contains("api_key"), "{text}");
    }

    #[test]
    fn a_failing_change_does_not_write() {
        let dir = tempfile::tempdir().unwrap();
        let store = SettingsStore::new(dir.path());

        let result = store.update(|_| Err(AppError::invalid_input("x")));

        assert!(result.is_err());
        assert!(!dir.path().join("settings.json").exists());
    }

    #[test]
    fn a_broken_file_is_an_error_and_is_left_untouched() {
        let dir = tempfile::tempdir().unwrap();
        let path = dir.path().join("settings.json");
        fs::write(&path, "{ broken").unwrap();
        let store = SettingsStore::new(dir.path());

        assert_eq!(store.load().unwrap_err().kind, AppErrorKind::Storage);
        assert!(store.update(|_| Ok(())).is_err());
        assert_eq!(fs::read_to_string(&path).unwrap(), "{ broken");
    }

    #[test]
    fn a_newer_version_is_refused_and_never_overwritten() {
        let dir = tempfile::tempdir().unwrap();
        let path = dir.path().join("settings.json");
        let newer = r#"{"version":2,"somethingNew":true}"#;
        fs::write(&path, newer).unwrap();
        let store = SettingsStore::new(dir.path());

        let error = store.load().unwrap_err();
        assert!(error.message.contains("新しいバージョン"), "{error}");
        assert!(store.update(|_| Ok(())).is_err());

        assert_eq!(fs::read_to_string(&path).unwrap(), newer);
    }

    #[test]
    fn unknown_extra_fields_in_the_current_version_are_tolerated() {
        let dir = tempfile::tempdir().unwrap();
        let book = ProfileBook::default();
        let json = format!(
            r#"{{"version":1,"future":1,"profileBook":{}}}"#,
            serde_json::to_string(&book).unwrap()
        );
        fs::write(dir.path().join("settings.json"), json).unwrap();

        assert_eq!(SettingsStore::new(dir.path()).load().unwrap(), book);
    }

    #[test]
    fn an_empty_book_in_the_file_is_normalized_to_the_default() {
        let dir = tempfile::tempdir().unwrap();
        fs::write(
            dir.path().join("settings.json"),
            r#"{"version":1,"profileBook":{"profiles":[],"activeId":"x"}}"#,
        )
        .unwrap();

        assert_eq!(
            SettingsStore::new(dir.path()).load().unwrap(),
            ProfileBook::default()
        );
    }
}
