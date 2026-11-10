//! IPC コマンドの入口。1グループ = 1ファイル。登録は `bindings.rs`。

pub mod app;
pub mod chat;
pub mod generation_settings;
pub mod history;
pub mod profiles;
pub mod secrets;
pub mod ui_settings;
