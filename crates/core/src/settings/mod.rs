//! 設定ファイル(`settings.json`)。接続プロファイル・画面の設定・生成の設定を1つのファイルに持つ。
//!
//! 読み書きは `store` に集約し、ファイルの形(version・アトミック書き込み)はそこだけが知る。

mod generation;
mod store;
mod ui;

pub use generation::{GenerationSettings, MAX_SYSTEM_PROMPT_CHARS};
pub use store::{SETTINGS_VERSION, SettingsStore};
pub use ui::{Theme, UiSettings};
