//! 設定の保存先(`settings.json`)。接続プロファイルと画面の設定を持つ。
//!
//! 書き込みは一時ファイル経由のアトミック書き込み。versionの方針:
//! 後方互換の追加(任意のフィールド)ではversionを上げず、読めない変更のときだけ上げる。
//! **新しいversionのファイルは読まず、上書きもしない**(`load` が失敗するので、保存まで進まない)。

use std::path::PathBuf;
use std::sync::Mutex;

use serde::{Deserialize, Serialize};

use super::generation::GenerationSettings;
use super::ui::UiSettings;
use crate::error::AppError;
use crate::fs::write_atomic;
use crate::profiles::ProfileBook;

/// このアプリが読み書きできるversion。
pub const SETTINGS_VERSION: u32 = 1;

const FILE_NAME: &str = "settings.json";

#[derive(Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct SettingsFile {
    version: u32,
    profile_book: ProfileBook,
    /// 後から足した項目。無い古いファイルは既定値で読む(versionは上げない)
    #[serde(default)]
    ui: UiSettings,
    #[serde(default)]
    generation: GenerationSettings,
}

/// `settings.json` の読み書き。読み込みと保存の間に他の書き込みが入らないよう直列化する。
///
/// プロファイルと画面の設定は同じファイルなので、1つのインスタンスを共有して使うこと
/// (別のインスタンスだとロックが別になり、書き込みが割り込む)。
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
        Ok(self.read()?.profile_book)
    }

    /// 読み込み → `change` → 保存を、他の書き込みと割り込まないように行う。保存後の内容を返す。
    /// 画面の設定はそのまま残す。
    pub fn update(
        &self,
        change: impl FnOnce(&mut ProfileBook) -> Result<(), AppError>,
    ) -> Result<ProfileBook, AppError> {
        let _guard = self.guard();
        let mut file = self.read()?;
        change(&mut file.profile_book)?;
        self.write(&file)?;
        Ok(file.profile_book)
    }

    /// 保存されている画面の設定。ファイルが無ければ初期値(保存はしない)。
    pub fn load_ui(&self) -> Result<UiSettings, AppError> {
        let _guard = self.guard();
        Ok(self.read()?.ui)
    }

    /// 画面の設定を `change` で変えて保存する。プロファイルはそのまま残す。保存後の内容を返す。
    pub fn update_ui(&self, change: impl FnOnce(&mut UiSettings)) -> Result<UiSettings, AppError> {
        let _guard = self.guard();
        let mut file = self.read()?;
        change(&mut file.ui);
        self.write(&file)?;
        Ok(file.ui)
    }

    /// 保存されている生成の設定。ファイルが無ければ初期値(保存はしない)。
    pub fn load_generation(&self) -> Result<GenerationSettings, AppError> {
        let _guard = self.guard();
        Ok(self.read()?.generation)
    }

    /// 生成の設定を検証して保存する。プロファイルと画面の設定はそのまま残す。保存後の内容を返す。
    pub fn save_generation(
        &self,
        generation: GenerationSettings,
    ) -> Result<GenerationSettings, AppError> {
        generation.validate()?;
        let _guard = self.guard();
        let mut file = self.read()?;
        file.generation = generation;
        self.write(&file)?;
        Ok(file.generation)
    }

    fn guard(&self) -> std::sync::MutexGuard<'_, ()> {
        self.lock
            .lock()
            .unwrap_or_else(std::sync::PoisonError::into_inner)
    }

    fn read(&self) -> Result<SettingsFile, AppError> {
        let text = match std::fs::read_to_string(&self.path) {
            Ok(text) => text,
            Err(e) if e.kind() == std::io::ErrorKind::NotFound => {
                return Ok(SettingsFile {
                    version: SETTINGS_VERSION,
                    profile_book: ProfileBook::default(),
                    ui: UiSettings::default(),
                    generation: GenerationSettings::default(),
                });
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
        let mut file: SettingsFile = serde_json::from_value(value).map_err(|_| broken())?;
        file.profile_book = file.profile_book.normalized();
        Ok(file)
    }

    fn write(&self, file: &SettingsFile) -> Result<(), AppError> {
        // 常に現在のversionで書く
        let file = SettingsFile {
            version: SETTINGS_VERSION,
            profile_book: file.profile_book.clone(),
            ui: file.ui.clone(),
            generation: file.generation.clone(),
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
    fn the_ui_settings_default_to_an_open_sidebar_without_creating_the_file() {
        let dir = tempfile::tempdir().unwrap();
        let store = SettingsStore::new(dir.path());

        assert_eq!(store.load_ui().unwrap(), UiSettings::default());
        assert!(!dir.path().join("settings.json").exists());
    }

    #[test]
    fn ui_updates_are_saved_and_keep_the_profiles() {
        let dir = tempfile::tempdir().unwrap();
        let store = SettingsStore::new(dir.path());
        let book = store
            .update(|book| {
                book.profiles[0].name = "自宅".into();
                Ok(())
            })
            .unwrap();

        let saved = store.update_ui(|ui| ui.sidebar_open = false).unwrap();

        assert!(!saved.sidebar_open);
        let reread = SettingsStore::new(dir.path());
        assert!(!reread.load_ui().unwrap().sidebar_open);
        assert_eq!(reread.load().unwrap(), book);
    }

    #[test]
    fn profile_updates_keep_the_ui_settings() {
        let dir = tempfile::tempdir().unwrap();
        let store = SettingsStore::new(dir.path());
        store.update_ui(|ui| ui.sidebar_open = false).unwrap();

        store
            .update(|book| {
                book.profiles[0].name = "自宅".into();
                Ok(())
            })
            .unwrap();

        assert!(!store.load_ui().unwrap().sidebar_open);
    }

    #[test]
    fn a_file_from_before_the_ui_settings_existed_still_loads() {
        let dir = tempfile::tempdir().unwrap();
        let book = ProfileBook::default();
        let json = format!(
            r#"{{"version":1,"profileBook":{}}}"#,
            serde_json::to_string(&book).unwrap()
        );
        fs::write(dir.path().join("settings.json"), json).unwrap();
        let store = SettingsStore::new(dir.path());

        assert_eq!(store.load().unwrap(), book);
        assert_eq!(store.load_ui().unwrap(), UiSettings::default());
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
        assert!(store.load_ui().is_err());
        assert!(store.update_ui(|_| {}).is_err());

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

    #[test]
    fn generation_settings_default_to_nothing_without_creating_the_file() {
        let dir = tempfile::tempdir().unwrap();
        let store = SettingsStore::new(dir.path());

        assert_eq!(
            store.load_generation().unwrap(),
            GenerationSettings::default()
        );
        assert!(!dir.path().join("settings.json").exists());
    }

    #[test]
    fn generation_settings_are_saved_and_keep_the_rest() {
        let dir = tempfile::tempdir().unwrap();
        let store = SettingsStore::new(dir.path());
        let book = store
            .update(|book| {
                book.profiles[0].name = "自宅".into();
                Ok(())
            })
            .unwrap();
        store.update_ui(|ui| ui.sidebar_open = false).unwrap();
        let generation = GenerationSettings {
            system_prompt: "簡潔に".into(),
            temperature: Some(0.7),
            max_tokens: Some(512),
        };

        let saved = store.save_generation(generation.clone()).unwrap();

        assert_eq!(saved, generation);
        let reread = SettingsStore::new(dir.path());
        assert_eq!(reread.load_generation().unwrap(), generation);
        assert_eq!(reread.load().unwrap(), book);
        assert!(!reread.load_ui().unwrap().sidebar_open);
        // 他の設定を更新しても、生成の設定は残る
        store.update_ui(|ui| ui.sidebar_open = true).unwrap();
        assert_eq!(store.load_generation().unwrap(), generation);
    }

    #[test]
    fn invalid_generation_settings_are_not_written() {
        let dir = tempfile::tempdir().unwrap();
        let store = SettingsStore::new(dir.path());

        let result = store.save_generation(GenerationSettings {
            max_tokens: Some(0),
            ..Default::default()
        });

        assert_eq!(result.unwrap_err().kind, AppErrorKind::InvalidInput);
        assert!(!dir.path().join("settings.json").exists());
    }
}
