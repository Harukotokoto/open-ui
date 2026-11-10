//! 設定ファイル(`settings.json`)。接続プロファイルと画面の設定を1つのファイルに持つ。
//!
//! 読み書きは `store` に集約し、ファイルの形(version・アトミック書き込み)はそこだけが知る。

mod store;
mod ui;

pub use store::{SETTINGS_VERSION, SettingsStore};
pub use ui::UiSettings;
