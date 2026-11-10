//! チャット履歴のコマンド。ファイルの読み書きは `open_ui_core::history` が行う。

use std::time::Duration;

use open_ui_core::error::AppError;
use open_ui_core::history::{
    Conversation, ConversationSummary, HistoryListing, SaveConversation, clean_generated_title,
    title_request, unix_now,
};
use tauri::State;

use crate::state::{AppState, blocking};

/// タイトルの生成を待つ上限。超えたら諦めて、最初の発言から作ったタイトルのままにする。
const TITLE_TIMEOUT: Duration = Duration::from_secs(60);

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

/// AIに会話のタイトルを考えさせて、付ける。付けたら更新後の要約を返す。
///
/// 次のときは何も変えず `None`(失敗ではない): 返答がまだ無い・AIの答えが使えない・生成中にユーザーが
/// 名前を変えた。サーバーに接続できないなどの失敗は `Err`。どちらでも、保存時に付けた
/// 「最初の発言から作ったタイトル」はそのまま残る。
#[tauri::command]
#[specta::specta]
pub async fn history_generate_title(
    state: State<'_, AppState>,
    id: String,
    profile_id: String,
) -> Result<Option<ConversationSummary>, AppError> {
    let history = state.history.clone();
    let profiles = state.profiles.clone();
    let (conversation, connection) = {
        let history = history.clone();
        let id = id.clone();
        blocking(move || Ok((history.load(&id)?, profiles.connection(&profile_id)?))).await?
    };
    let Some(request) = title_request(&conversation.messages) else {
        return Ok(None);
    };

    let raw = state
        .api
        .complete(&connection, &request, TITLE_TIMEOUT)
        .await?;
    let Some(title) = clean_generated_title(&raw) else {
        return Ok(None);
    };
    blocking(move || history.set_generated_title(&id, &title)).await
}

/// 会話を削除する。
#[tauri::command]
#[specta::specta]
pub async fn history_delete(state: State<'_, AppState>, id: String) -> Result<(), AppError> {
    let history = state.history.clone();
    blocking(move || history.delete(&id)).await
}
