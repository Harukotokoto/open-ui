//! 添付ファイルのコマンド。検査・保存は `open_ui_core::attachments` が行う。

use open_ui_core::attachments::{
    AttachmentFailure, AttachmentImage, AttachmentInfo, AttachmentPick,
};
use open_ui_core::error::AppError;
use tauri::{AppHandle, State};
use tauri_plugin_dialog::DialogExt;

use crate::state::{AppState, blocking};

/// 画面にドロップされた・`<input type="file">` で選ばれたファイルを保存する。
/// `data` はbase64。種類は中身から決めるので、ブラウザが付けた型は受け取らない。
#[tauri::command]
#[specta::specta]
pub async fn attachment_add(
    state: State<'_, AppState>,
    conversation_id: String,
    filename: String,
    data: String,
) -> Result<AttachmentInfo, AppError> {
    let attachments = state.attachments.clone();
    blocking(move || attachments.add_base64(&conversation_id, &filename, &data)).await
}

/// OSのダイアログでファイルを選ばせて、保存する。キャンセルしたら、どちらも空。
/// 1件が読めなくても他は保存し、読めなかったものは `failed` で返す。
#[tauri::command]
#[specta::specta]
pub async fn attachment_pick(
    app: AppHandle,
    state: State<'_, AppState>,
    conversation_id: String,
) -> Result<AttachmentPick, AppError> {
    let attachments = state.attachments.clone();
    blocking(move || {
        let picked = app
            .dialog()
            .file()
            .blocking_pick_files()
            .unwrap_or_default();
        let mut pick = AttachmentPick {
            added: Vec::new(),
            failed: Vec::new(),
        };
        for file in picked {
            let path = match file.into_path() {
                Ok(path) => path,
                Err(error) => {
                    pick.failed.push(AttachmentFailure {
                        filename: String::new(),
                        message: format!("ファイルの場所を取得できませんでした: {error}"),
                    });
                    continue;
                }
            };
            match attachments.add_path(&conversation_id, &path) {
                Ok(info) => pick.added.push(info),
                Err(error) => pick.failed.push(AttachmentFailure {
                    filename: path
                        .file_name()
                        .map(|name| name.to_string_lossy().into_owned())
                        .unwrap_or_default(),
                    message: error.message,
                }),
            }
        }
        Ok(pick)
    })
    .await
}

/// 入力欄で外した添付を消す。すでに無ければ何もしない。
#[tauri::command]
#[specta::specta]
pub async fn attachment_remove(
    state: State<'_, AppState>,
    conversation_id: String,
    id: String,
) -> Result<(), AppError> {
    let attachments = state.attachments.clone();
    blocking(move || attachments.remove(&conversation_id, &id)).await
}

/// 画像の中身(サムネイルの表示用)。
#[tauri::command]
#[specta::specta]
pub async fn attachment_image(
    state: State<'_, AppState>,
    conversation_id: String,
    id: String,
) -> Result<AttachmentImage, AppError> {
    let attachments = state.attachments.clone();
    blocking(move || attachments.image(&conversation_id, &id)).await
}
