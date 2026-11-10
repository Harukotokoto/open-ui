//! API呼び出しの入出力の型。IPCでフロントと共有する。

use serde::{Deserialize, Serialize};
use specta::Type;

/// 接続先のAPIの種類。⑥でAnthropicなどを足すときはここにバリアントを追加する。
#[derive(Debug, Clone, Copy, Default, PartialEq, Eq, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub enum ProviderKind {
    /// OpenAI互換(LM Studio・Ollama・llama.cpp・vLLMなど)
    #[default]
    OpenAiCompatible,
}

/// 会話の発言者。
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub enum Role {
    System,
    User,
    Assistant,
}

/// サーバーへ送る1メッセージ。思考(reasoning)は含めない。
///
/// ⑤(画像)・⑦(ツール呼び出し)でパーツ列へ拡張する。
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct WireMessage {
    pub role: Role,
    pub content: String,
}

/// フロントへ流すチャットのイベント。1リクエストにつき最後に `Done` か `Error` が1回届く。
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Type)]
#[serde(tag = "type", rename_all = "camelCase")]
pub enum ChatEvent {
    /// 本文の増分
    Delta { text: String },
    /// 思考の増分
    Reasoning { text: String },
    /// 完了(中断された場合も含む)
    Done,
    /// 失敗。メッセージは日本語
    Error { message: String },
}

/// イベントの送り先。Tauriの非同期コマンドで使えるよう `Send` にしている。
pub type Emit<'a> = &'a mut (dyn FnMut(ChatEvent) + Send);

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn chat_events_are_tagged_by_type() {
        let delta = serde_json::to_string(&ChatEvent::Delta { text: "あ".into() }).unwrap();
        assert_eq!(delta, r#"{"type":"delta","text":"あ"}"#);
        let done = serde_json::to_string(&ChatEvent::Done).unwrap();
        assert_eq!(done, r#"{"type":"done"}"#);
        let error = serde_json::to_string(&ChatEvent::Error {
            message: "x".into(),
        })
        .unwrap();
        assert_eq!(error, r#"{"type":"error","message":"x"}"#);
    }

    #[test]
    fn wire_messages_use_lowercase_roles() {
        let message = WireMessage {
            role: Role::Assistant,
            content: "こんにちは".into(),
        };
        assert_eq!(
            serde_json::to_string(&message).unwrap(),
            r#"{"role":"assistant","content":"こんにちは"}"#
        );
    }
}
