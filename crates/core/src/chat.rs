//! チャット開始のリクエスト。

use serde::Deserialize;
use specta::Type;

use crate::api::Role;
use crate::error::AppError;
use crate::profiles::is_valid_id;

/// フロントが送る1メッセージ。思考(reasoning)は含めない。
///
/// 添付は中身ではなく、保存済みの添付のIDだけを渡す(中身は送信時にRustが読む)。
#[derive(Debug, Clone, PartialEq, Eq, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct ChatMessage {
    pub role: Role,
    pub content: String,
    /// 添付のID。ユーザーのメッセージだけが持てる
    #[serde(default)]
    pub attachments: Vec<String>,
}

/// フロントが `chat_start` に渡すリクエスト。
///
/// サーバーのURL・APIキー・モデルは含めない。`profile_id` からRustが引く。
#[derive(Debug, Clone, PartialEq, Eq, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct ChatRequest {
    /// フロントが発行するID(UUID)。中断の対象を指す
    pub request_id: String,
    pub profile_id: String,
    /// 添付の置き場になる会話のID。添付があるメッセージを送るときに要る
    #[serde(default)]
    pub conversation_id: Option<String>,
    pub messages: Vec<ChatMessage>,
    /// 画面が描ける書式(独自コンポーネントなど)をAIに伝える説明。システムプロンプトの後ろに足す。
    /// 画面の部品と同じ場所で管理するため、フロントが渡す。無ければ足さない
    #[serde(default)]
    pub format_guide: Option<String>,
}

/// 書式の説明の最大文字数。
pub const MAX_FORMAT_GUIDE_CHARS: usize = 20_000;

impl ChatRequest {
    pub fn validate(&self) -> Result<(), AppError> {
        if !is_valid_id(&self.request_id) {
            return Err(AppError::invalid_input("リクエストIDが正しくありません"));
        }
        if !is_valid_id(&self.profile_id) {
            return Err(AppError::invalid_input("接続先のIDが正しくありません"));
        }
        if self.messages.is_empty() {
            return Err(AppError::invalid_input("送信するメッセージがありません"));
        }
        if self
            .conversation_id
            .as_deref()
            .is_some_and(|id| !is_valid_id(id))
        {
            return Err(AppError::invalid_input("会話のIDが正しくありません"));
        }
        if self
            .messages
            .iter()
            .flat_map(|message| &message.attachments)
            .any(|id| !is_valid_id(id))
        {
            return Err(AppError::invalid_input(
                "添付ファイルのIDが正しくありません",
            ));
        }
        if self
            .format_guide
            .as_deref()
            .is_some_and(|guide| guide.chars().count() > MAX_FORMAT_GUIDE_CHARS)
        {
            return Err(AppError::invalid_input("書式の説明が長すぎます"));
        }
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn request() -> ChatRequest {
        ChatRequest {
            request_id: "3f2b8c1e-5a0d-4b7e-9c11-2d6a8e4f7b90".into(),
            profile_id: "default".into(),
            conversation_id: None,
            messages: vec![ChatMessage {
                role: Role::User,
                content: "hi".into(),
                attachments: vec![],
            }],
            format_guide: None,
        }
    }

    #[test]
    fn a_well_formed_request_is_valid() {
        assert!(request().validate().is_ok());
    }

    #[test]
    fn malformed_ids_and_empty_messages_are_rejected() {
        let bad_request_id = ChatRequest {
            request_id: "a b".into(),
            ..request()
        };
        let bad_profile_id = ChatRequest {
            profile_id: "../x".into(),
            ..request()
        };
        let no_messages = ChatRequest {
            messages: vec![],
            ..request()
        };

        assert!(bad_request_id.validate().is_err());
        assert!(bad_profile_id.validate().is_err());
        assert!(no_messages.validate().is_err());
    }

    #[test]
    fn deserializes_from_the_camel_case_json_the_frontend_sends() {
        let json = r#"{"requestId":"r1","profileId":"default","messages":[{"role":"user","content":"hi"}]}"#;
        let parsed: ChatRequest = serde_json::from_str(json).unwrap();
        assert_eq!(parsed.request_id, "r1");
        assert_eq!(parsed.messages[0].role, Role::User);
        // 省略できる
        assert_eq!(parsed.format_guide, None);
        assert_eq!(parsed.conversation_id, None);
        assert!(parsed.messages[0].attachments.is_empty());
    }

    #[test]
    fn attachments_and_the_conversation_are_read_from_the_frontend_json() {
        let json = r#"{"requestId":"r1","profileId":"default","conversationId":"c1","messages":[{"role":"user","content":"","attachments":["a1","a2"]}]}"#;

        let parsed: ChatRequest = serde_json::from_str(json).unwrap();

        assert_eq!(parsed.conversation_id.as_deref(), Some("c1"));
        assert_eq!(parsed.messages[0].attachments, ["a1", "a2"]);
        assert!(parsed.validate().is_ok());
    }

    #[test]
    fn malformed_conversation_and_attachment_ids_are_rejected() {
        let bad_conversation = ChatRequest {
            conversation_id: Some("../x".into()),
            ..request()
        };
        let mut bad_attachment = request();
        bad_attachment.messages[0].attachments = vec!["a/b".into()];

        assert!(bad_conversation.validate().is_err());
        assert!(bad_attachment.validate().is_err());
    }

    #[test]
    fn an_overlong_format_guide_is_rejected() {
        let too_long = ChatRequest {
            format_guide: Some("あ".repeat(MAX_FORMAT_GUIDE_CHARS + 1)),
            ..request()
        };
        let at_the_limit = ChatRequest {
            format_guide: Some("あ".repeat(MAX_FORMAT_GUIDE_CHARS)),
            ..request()
        };

        assert!(too_long.validate().is_err());
        assert!(at_the_limit.validate().is_ok());
    }
}
