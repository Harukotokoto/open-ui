//! 接続プロファイル(LM Studio・Ollama など)とAPIキー。
//!
//! UIに依存しないデータとロジックだけを置く。`model` は1件、`book` は一覧と使用中のもの、
//! `preset` は追加するときの雛形、`url` は入力の検査、`keys` はOSの資格情報ストアのAPIキー、
//! `service` はそれらと設定ファイル(→ `settings`)をまとめた入口。

mod book;
mod keys;
mod model;
mod preset;
mod service;
mod url;

pub use book::ProfileBook;
pub use keys::{KeyStatus, ProfileKeys, api_key_account};
pub use model::{ConnectionProfile, DEFAULT_PROFILE_ID, is_valid_id};
pub use preset::ProfilePreset;
pub use service::{ProfileAdded, ProfileService};
pub use url::validate_base_url;
