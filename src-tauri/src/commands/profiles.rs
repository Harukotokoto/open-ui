//! 接続プロファイルのコマンド。キーは扱わない(→ `secrets`)。

use open_ui_core::error::AppError;
use open_ui_core::profiles::{ConnectionProfile, ProfileBook};
use tauri::State;

use crate::state::{AppState, blocking};

/// プロファイルの一覧と、使用中のプロファイル。
#[tauri::command]
#[specta::specta]
pub async fn profiles_get(state: State<'_, AppState>) -> Result<ProfileBook, AppError> {
    let profiles = state.profiles.clone();
    blocking(move || profiles.book()).await
}

/// 既存のプロファイルを更新する。入力を検査し、更新後の一覧を返す。
#[tauri::command]
#[specta::specta]
pub async fn profiles_update(
    state: State<'_, AppState>,
    profile: ConnectionProfile,
) -> Result<ProfileBook, AppError> {
    let profiles = state.profiles.clone();
    blocking(move || profiles.update_profile(&profile)).await
}

/// 入力中のプロファイルでサーバーに接続できるか確かめ、見つかったモデルのIDを返す。
///
/// 何も保存しない。`api_key` が無ければ、保存済みのキーを使う。
#[tauri::command]
#[specta::specta]
pub async fn connection_test(
    state: State<'_, AppState>,
    profile: ConnectionProfile,
    api_key: Option<String>,
) -> Result<Vec<String>, AppError> {
    let profiles = state.profiles.clone();
    let connection =
        blocking(move || profiles.draft_connection(&profile, api_key.as_deref())).await?;
    state.api.list_models(&connection).await
}
