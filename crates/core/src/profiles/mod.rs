//! 接続プロファイル(LM Studio・Ollama など)とAPIキー。
//!
//! UIに依存しないデータとロジックだけを置く。`model` は1件、`book` は一覧と使用中のもの、
//! `url` は入力の検査、`store` は設定ファイル、`keys` はOSの資格情報ストアのAPIキー、
//! `service` はそれらをまとめた入口。

mod book;
mod keys;
mod model;
mod service;
mod store;
mod url;

pub use book::ProfileBook;
pub use keys::{KeyStatus, ProfileKeys, api_key_account};
pub use model::{ConnectionProfile, DEFAULT_PROFILE_ID, is_valid_id};
pub use service::ProfileService;
pub use store::{SETTINGS_VERSION, SettingsStore};
pub use url::validate_base_url;
