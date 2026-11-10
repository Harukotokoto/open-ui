//! チャットのコマンド。

use open_ui_core::api::ChatEvent;
use open_ui_core::chat::ChatRequest;
use open_ui_core::error::AppError;
use tauri::State;
use tauri::ipc::Channel;

use crate::state::{AppState, blocking};

/// 返答の生成を始め、完了・中断・失敗まで `on_event` にイベントを流す。
///
/// 失敗(接続先が無い・接続できない・サーバーのエラーなど)も、最後の `Error` イベントで伝える。
/// このコマンド自体は、イベントを流し終えてから `Ok` を返す。
#[tauri::command]
#[specta::specta]
pub async fn chat_start(
    state: State<'_, AppState>,
    request: ChatRequest,
    on_event: Channel<ChatEvent>,
) -> Result<(), AppError> {
    // 受け手(画面)が閉じていたら、送信の失敗は無視してよい
    let emit = |event: ChatEvent| {
        let _ = on_event.send(event);
    };

    let profiles = state.profiles.clone();
    let settings = state.settings.clone();
    let attachments = state.attachments.clone();
    let profile_id = request.profile_id.clone();
    let conversation_id = request.conversation_id.clone();
    let chat_messages = request.messages.clone();
    // 接続先と生成の設定は、リクエストのたびに読む(設定の変更がすぐ反映される)。
    // 添付の読み込み(画像のbase64化など)も、ここでまとめて別スレッドに任せる
    let prepared = match request.validate() {
        Ok(()) => {
            blocking(move || {
                Ok((
                    profiles.connection(&profile_id)?,
                    settings.load_generation()?,
                    attachments.resolve(conversation_id.as_deref(), &chat_messages)?,
                ))
            })
            .await
        }
        Err(error) => Err(error),
    };
    match prepared {
        Ok((connection, generation, wire_messages)) => {
            let messages =
                generation.with_system_prompt(&wire_messages, request.format_guide.as_deref());
            state
                .api
                .chat(
                    &request.request_id,
                    &connection,
                    &messages,
                    generation.params(),
                    emit,
                )
                .await;
        }
        Err(error) => emit(ChatEvent::Error {
            message: error.message,
        }),
    }
    Ok(())
}

/// 実行中の返答の生成を中断する。完了済み・存在しないIDでも何も起きない。
#[tauri::command]
#[specta::specta]
pub fn chat_cancel(state: State<'_, AppState>, request_id: String) {
    state.api.cancel(&request_id);
}
