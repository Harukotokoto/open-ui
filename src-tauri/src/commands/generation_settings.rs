//! 生成の設定(システムプロンプト・temperature・最大トークン数)のコマンド。

use open_ui_core::error::AppError;
use open_ui_core::settings::GenerationSettings;
use tauri::State;

use crate::state::{AppState, blocking};

/// 保存されている生成の設定。
#[tauri::command]
#[specta::specta]
pub async fn generation_settings_get(
    state: State<'_, AppState>,
) -> Result<GenerationSettings, AppError> {
    let settings = state.settings.clone();
    blocking(move || settings.load_generation()).await
}

/// 生成の設定を検証して保存する。保存後の内容を返す。
#[tauri::command]
#[specta::specta]
pub async fn generation_settings_update(
    state: State<'_, AppState>,
    generation: GenerationSettings,
) -> Result<GenerationSettings, AppError> {
    let settings = state.settings.clone();
    blocking(move || settings.save_generation(generation)).await
}
