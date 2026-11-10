//! チャット履歴のコマンド。ファイルの読み書きは `open_ui_core::history` が行う。

use open_ui_core::error::AppError;
use open_ui_core::history::{
    Conversation, ConversationSummary, HistoryListing, SaveConversation, unix_now,
};
use tauri::State;

use crate::state::{AppState, blocking};

/// 履歴の一覧(更新が新しい順)。メッセージは含まない。
#[tauri::command]
#[specta::specta]
pub async fn history_list(state: State<'_, AppState>) -> Result<HistoryListing, AppError> {
    let history = state.history.clone();
    blocking(move || history.list()).await
}

/// 会話1件(メッセージを含む)。
#[tauri::command]
#[specta::specta]
pub async fn history_load(
    state: State<'_, AppState>,
    id: String,
) -> Result<Conversation, AppError> {
    let history = state.history.clone();
    blocking(move || history.load(&id)).await
}

/// 会話を保存する。メッセージが空なら何も保存せず `None`。
#[tauri::command]
#[specta::specta]
pub async fn history_save(
    state: State<'_, AppState>,
    conversation: SaveConversation,
) -> Result<Option<ConversationSummary>, AppError> {
    let history = state.history.clone();
    blocking(move || history.save(&conversation.id, conversation.messages, unix_now())).await
}

/// 会話の名前を変える。
#[tauri::command]
#[specta::specta]
pub async fn history_rename(
    state: State<'_, AppState>,
    id: String,
    title: String,
) -> Result<ConversationSummary, AppError> {
    let history = state.history.clone();
    blocking(move || history.rename(&id, &title)).await
}

/// 会話を削除する。
#[tauri::command]
#[specta::specta]
pub async fn history_delete(state: State<'_, AppState>, id: String) -> Result<(), AppError> {
    let history = state.history.clone();
    blocking(move || history.delete(&id)).await
}
