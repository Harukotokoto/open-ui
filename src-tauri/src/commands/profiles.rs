//! 接続プロファイルのコマンド。キーは扱わない(→ `secrets`)。

use open_ui_core::error::AppError;
use open_ui_core::profiles::{ConnectionProfile, ProfileAdded, ProfileBook, ProfilePreset};
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

/// 雛形(LM Studio・Ollama など)から新しいプロファイルを追加する。追加後の一覧と新しいIDを返す。
#[tauri::command]
#[specta::specta]
pub async fn profiles_add(
    state: State<'_, AppState>,
    preset: ProfilePreset,
) -> Result<ProfileAdded, AppError> {
    let profiles = state.profiles.clone();
    blocking(move || profiles.add_profile(preset)).await
}

/// プロファイルを削除する(APIキーも消える)。最後の1件は削除できない。
#[tauri::command]
#[specta::specta]
pub async fn profiles_remove(
    state: State<'_, AppState>,
    profile_id: String,
) -> Result<ProfileBook, AppError> {
    let profiles = state.profiles.clone();
    blocking(move || profiles.remove_profile(&profile_id)).await
}

/// 使用中のプロファイルを切り替える。
#[tauri::command]
#[specta::specta]
pub async fn profiles_set_active(
    state: State<'_, AppState>,
    profile_id: String,
) -> Result<ProfileBook, AppError> {
    let profiles = state.profiles.clone();
    blocking(move || profiles.set_active(&profile_id)).await
}

/// プロファイルのモデルを選び、そのプロファイルを使用中にする。`model` が無ければサーバーの既定。
#[tauri::command]
#[specta::specta]
pub async fn profiles_select_model(
    state: State<'_, AppState>,
    profile_id: String,
    model: Option<String>,
) -> Result<ProfileBook, AppError> {
    let profiles = state.profiles.clone();
    blocking(move || profiles.select_model(&profile_id, model.as_deref())).await
}

/// 保存済みのプロファイルのサーバーにあるモデルのIDを返す。保存済みのキーで問い合わせる。
#[tauri::command]
#[specta::specta]
pub async fn models_list(
    state: State<'_, AppState>,
    profile_id: String,
) -> Result<Vec<String>, AppError> {
    let profiles = state.profiles.clone();
    let connection = blocking(move || profiles.connection(&profile_id)).await?;
    state.api.list_models(&connection).await
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
