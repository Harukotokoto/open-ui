//! 画面の設定(サイドバーの開閉など)のコマンド。

use open_ui_core::error::AppError;
use open_ui_core::settings::UiSettings;
use tauri::State;

use crate::state::{AppState, blocking};

/// 保存されている画面の設定。
#[tauri::command]
#[specta::specta]
pub async fn ui_settings_get(state: State<'_, AppState>) -> Result<UiSettings, AppError> {
    let settings = state.settings.clone();
    blocking(move || settings.load_ui()).await
}

/// 画面の設定を保存する。保存後の内容を返す。
#[tauri::command]
#[specta::specta]
pub async fn ui_settings_update(
    state: State<'_, AppState>,
    ui: UiSettings,
) -> Result<UiSettings, AppError> {
    let settings = state.settings.clone();
    blocking(move || settings.update_ui(|current| *current = ui)).await
}
