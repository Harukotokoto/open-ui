//! 添付ファイルの型と上限。

use std::time::Duration;

use serde::{Deserialize, Serialize};
use specta::Type;

/// 1ファイルの最大サイズ(バイト)。読み込む前のサイズに対する上限。
pub const MAX_FILE_BYTES: usize = 10 * 1024 * 1024;
/// 1メッセージに付けられるファイルの最大数。
pub const MAX_FILES_PER_MESSAGE: usize = 10;
/// 1メッセージに付けるファイルの合計サイズの上限(バイト。保存後のサイズで数える)。
pub const MAX_TOTAL_BYTES_PER_MESSAGE: usize = 25 * 1024 * 1024;
/// 画像の長辺の最大ピクセル数。超えたら縮小する。
pub const MAX_IMAGE_EDGE: u32 = 2048;
/// 会話に紐づかなくなった(送信されなかった)ファイルを消すまでの猶予。
pub const ORPHAN_GRACE: Duration = Duration::from_secs(24 * 60 * 60);

/// 添付の種類。中身を見て決める(拡張子やブラウザが付けた型は信用しない)。
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub enum AttachmentKind {
    /// 画像。マルチモーダルとして送る
    Image,
    /// テキスト・コード。本文をプロンプトに埋め込む
    Text,
    /// PDF。取り出したテキストをプロンプトに埋め込む
    Pdf,
}

/// 保存した添付1件の情報。フロントが会話に残す(`FileUIPart`)ための値。
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct AttachmentInfo {
    /// Rustが発行するUUID。保存先のファイル名にもなる
    pub id: String,
    /// 表示用の名前。パスの区切りなどは取り除いてあり、保存先のパスには使わない
    pub filename: String,
    pub media_type: String,
    pub kind: AttachmentKind,
    /// 保存したサイズ(バイト)。画像は縮小後
    pub size: u32,
}

/// 画像の中身。サムネイルの表示に使う。
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct AttachmentImage {
    pub media_type: String,
    /// base64(`data:` URL の本体部分)
    pub data: String,
}

/// 読み込めなかったファイル1件。
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct AttachmentFailure {
    pub filename: String,
    pub message: String,
}

/// ファイルを選ぶダイアログの結果。選べたものと、読み込めなかったものを分けて返す。
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct AttachmentPick {
    pub added: Vec<AttachmentInfo>,
    pub failed: Vec<AttachmentFailure>,
}
