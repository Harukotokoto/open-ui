//! API呼び出しの入出力の型。IPCでフロントと共有する。

use serde::ser::SerializeMap;
use serde::{Deserialize, Serialize};
use serde_json::json;
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
/// 画像が無ければ `{"role", "content": "文字列"}`、あれば `content` を文字列と画像のパーツ列にして
/// 送る(OpenAI互換の形)。⑦(ツール呼び出し)でパーツ列を広げる。フロントとは直接やり取りしない
/// (フロントが送るのは `ChatMessage`。添付の参照は送信前に解決する)。
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct WireMessage {
    pub role: Role,
    pub content: String,
    pub images: Vec<WireImage>,
}

/// メッセージに付ける画像1枚。
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct WireImage {
    pub media_type: String,
    pub data_base64: String,
}

impl WireMessage {
    /// 文字だけのメッセージ。
    pub fn text(role: Role, content: String) -> Self {
        Self {
            role,
            content,
            images: Vec::new(),
        }
    }
}

impl Serialize for WireMessage {
    fn serialize<S: serde::Serializer>(&self, serializer: S) -> Result<S::Ok, S::Error> {
        let mut map = serializer.serialize_map(Some(2))?;
        map.serialize_entry("role", &self.role)?;
        if self.images.is_empty() {
            map.serialize_entry("content", &self.content)?;
        } else {
            let mut parts = Vec::with_capacity(self.images.len() + 1);
            if !self.content.is_empty() {
                parts.push(json!({"type": "text", "text": self.content}));
            }
            for image in &self.images {
                parts.push(json!({
                    "type": "image_url",
                    "image_url": {
                        "url": format!("data:{};base64,{}", image.media_type, image.data_base64),
                    },
                }));
            }
            map.serialize_entry("content", &parts)?;
        }
        map.end()
    }
}

/// リクエストに付ける生成のパラメーター。None はサーバーの既定に任せる。
#[derive(Debug, Clone, Copy, Default, PartialEq)]
pub struct GenerationParams {
    pub temperature: Option<f32>,
    pub max_tokens: Option<u32>,
}

/// フロントへ流すチャットのイベント。1リクエストにつき最後に `Done` か `Error` が1回届く。
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Type)]
#[serde(tag = "type", rename_all = "camelCase")]
pub enum ChatEvent {
    /// 本文の増分
    Delta { text: String },
    /// 思考の増分
    Reasoning { text: String },
    /// 出力の統計。出力があったときだけ、`Done` の直前に1回届く(中断・JSON応答では届かない)
    #[serde(rename_all = "camelCase")]
    Stats {
        /// 出力したトークン数(思考を含む)
        tokens: u32,
        /// 最初の出力から最後の出力までの時間(ミリ秒)。待ち時間(プロンプトの処理)は含まない
        elapsed_ms: u32,
        /// サーバーが数を返さず、受け取ったチャンクの数で代用したとき `true`
        estimated: bool,
    },
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
    fn stats_use_camel_case_fields() {
        let stats = serde_json::to_string(&ChatEvent::Stats {
            tokens: 42,
            elapsed_ms: 1500,
            estimated: false,
        })
        .unwrap();
        assert_eq!(
            stats,
            r#"{"type":"stats","tokens":42,"elapsedMs":1500,"estimated":false}"#
        );
    }

    #[test]
    fn wire_messages_use_lowercase_roles() {
        let message = WireMessage::text(Role::Assistant, "こんにちは".into());
        assert_eq!(
            serde_json::to_string(&message).unwrap(),
            r#"{"role":"assistant","content":"こんにちは"}"#
        );
    }

    fn image() -> WireImage {
        WireImage {
            media_type: "image/png".into(),
            data_base64: "AAAA".into(),
        }
    }

    #[test]
    fn a_message_with_images_sends_content_parts() {
        let message = WireMessage {
            role: Role::User,
            content: "これは?".into(),
            images: vec![image()],
        };

        assert_eq!(
            serde_json::to_value(&message).unwrap(),
            json!({
                "role": "user",
                "content": [
                    {"type": "text", "text": "これは?"},
                    {"type": "image_url", "image_url": {"url": "data:image/png;base64,AAAA"}},
                ],
            })
        );
    }

    #[test]
    fn an_image_only_message_has_no_text_part() {
        let message = WireMessage {
            role: Role::User,
            content: String::new(),
            images: vec![image(), image()],
        };

        let value = serde_json::to_value(&message).unwrap();

        let parts = value["content"].as_array().unwrap();
        assert_eq!(parts.len(), 2);
        assert!(parts.iter().all(|part| part["type"] == "image_url"));
    }
}
