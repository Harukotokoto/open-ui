//! チャット履歴。1会話 = 1ファイルのJSONで、アプリのデータディレクトリに置く。
//!
//! `model` は型とファイルの形、`title` はタイトルを作る純粋関数、`store` はファイルの読み書き。
//! 検索・日付のグループ分けは、一覧のメタデータだけで済むのでフロントで行う。
//! `ai_title` はAIにタイトルを考えさせる依頼の組み立てと、返答の整形。

mod ai_title;
mod model;
mod store;
mod title;

use std::time::{SystemTime, UNIX_EPOCH};

pub use ai_title::{clean_generated_title, title_request};
pub use model::{
    Conversation, ConversationSummary, HISTORY_VERSION, HistoryListing, SaveConversation,
};
pub use store::HistoryStore;

/// 現在の時刻(UNIX秒)。保存の関数は時刻を引数で受け取るので、呼び出し側がこれを渡す。
pub fn unix_now() -> u32 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map_or(0, |elapsed| {
            u32::try_from(elapsed.as_secs()).unwrap_or(u32::MAX)
        })
}
