//! 会話の履歴の型と、保存するファイルの形。

use serde::{Deserialize, Serialize};
use serde_json::Value;
use specta::Type;

use crate::error::AppError;

/// このアプリが読み書きできるversion。
///
/// 後方互換の追加(任意のフィールド)では上げない。読めない変更のときだけ上げる。
pub const HISTORY_VERSION: u32 = 1;

/// 一覧に出す1件。メッセージ本文は含まない。時刻はUNIX秒。
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct ConversationSummary {
    pub id: String,
    pub title: String,
    pub created_at: u32,
    pub updated_at: u32,
}

/// 会話1件。`messages` はフロントの `UIMessage`(parts形式)をそのまま持つ。
///
/// 中身の形(添付・ツール呼び出しなどのパーツ)はフロントが増やしていくため、Rustでは解釈しない。
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct Conversation {
    pub id: String,
    pub title: String,
    pub created_at: u32,
    pub updated_at: u32,
    // `Value` の型はi64を含み、TypeScriptへ書き出せない(BigInt禁止)ため `unknown` に上書きする
    #[specta(type = Vec<specta_typescript::Unknown>)]
    pub messages: Vec<Value>,
}

/// 会話の保存の依頼。メッセージが空なら何も保存しない。
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct SaveConversation {
    /// フロントが発行するUUID。新しい会話もこのIDで保存される
    pub id: String,
    #[specta(type = Vec<specta_typescript::Unknown>)]
    pub messages: Vec<Value>,
}

/// 履歴の一覧。読めなかったファイルは一覧に入れず、件数だけ知らせる(ファイルには触らない)。
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct HistoryListing {
    /// 更新が新しい順
    pub conversations: Vec<ConversationSummary>,
    /// 壊れている、または新しいversionのため一覧から外したファイルの数
    pub skipped: u32,
}

/// ディスク上の1ファイル。ファイル名(`<id>.json`)が会話の正で、中の `id` は参考にしない。
#[derive(Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub(super) struct ConversationFile {
    pub version: u32,
    /// 読み込みでは使わない(無くてもよい)
    #[serde(default)]
    pub id: String,
    pub title: String,
    pub created_at: u32,
    pub updated_at: u32,
    pub messages: Vec<Value>,
}

/// 一覧用に、メッセージを読み飛ばして読む形。
#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub(super) struct MetaFile {
    pub title: String,
    pub created_at: u32,
    pub updated_at: u32,
}

/// 保存するメッセージの最低限の形を確かめる。中身のパーツは解釈しない。
pub(super) fn validate_messages(messages: &[Value]) -> Result<(), AppError> {
    let valid = messages.iter().all(|message| {
        message["id"].as_str().is_some_and(|id| !id.is_empty())
            && matches!(
                message["role"].as_str(),
                Some("user" | "assistant" | "system")
            )
            && message["parts"].is_array()
    });
    if valid {
        Ok(())
    } else {
        Err(AppError::invalid_input("会話の形式が正しくありません"))
    }
}

#[cfg(test)]
mod tests {
    use serde_json::json;

    use super::*;

    #[test]
    fn well_formed_messages_pass() {
        let messages = [
            json!({"id": "m1", "role": "user", "parts": [{"type": "text", "text": "a"}]}),
            json!({"id": "m2", "role": "assistant", "parts": [], "metadata": {"x": 1}}),
        ];
        assert!(validate_messages(&messages).is_ok());
        assert!(validate_messages(&[]).is_ok());
    }

    #[test]
    fn malformed_messages_are_rejected() {
        let bad = [
            json!("text"),
            json!({"role": "user", "parts": []}),
            json!({"id": "", "role": "user", "parts": []}),
            json!({"id": "m", "role": "tool", "parts": []}),
            json!({"id": "m", "role": "user"}),
            json!({"id": "m", "role": "user", "parts": "x"}),
        ];
        for message in bad {
            assert!(
                validate_messages(std::slice::from_ref(&message)).is_err(),
                "{message}"
            );
        }
    }
}
