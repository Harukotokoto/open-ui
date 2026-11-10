//! 添付ファイル(テキスト/コード・画像・PDF)。
//!
//! 中身から種類を決めて(`sniff`)、画像は縮小し(`picture`)、PDFはテキストを取り出し(`pdf`)、
//! 会話ごとのディレクトリに保存する(`store`)。送信時は、保存した添付への参照を、サーバーへ送る
//! メッセージにする(`resolve`)。会話のJSONには参照(`attachment://<id>`)だけを持たせる。

mod model;
mod pdf;
mod picture;
mod resolve;
mod sniff;
mod store;

pub use model::{
    AttachmentFailure, AttachmentImage, AttachmentInfo, AttachmentKind, AttachmentPick,
    MAX_FILE_BYTES, MAX_FILES_PER_MESSAGE, MAX_IMAGE_EDGE, MAX_TOTAL_BYTES_PER_MESSAGE,
    ORPHAN_GRACE,
};
pub use store::{AttachmentStore, URL_PREFIX, referenced_ids};
