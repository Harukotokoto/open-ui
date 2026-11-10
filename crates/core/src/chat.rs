//! チャット開始のリクエスト。

use serde::Deserialize;
use specta::Type;

use crate::api::WireMessage;
use crate::error::AppError;
use crate::profiles::is_valid_id;

/// フロントが `chat_start` に渡すリクエスト。
///
/// サーバーのURL・APIキー・モデルは含めない。`profile_id` からRustが引く。
#[derive(Debug, Clone, PartialEq, Eq, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct ChatRequest {
    /// フロントが発行するID(UUID)。中断の対象を指す
    pub request_id: String,
    pub profile_id: String,
    /// 思考(reasoning)は含めない
    pub messages: Vec<WireMessage>,
}

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
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::api::Role;

    fn request() -> ChatRequest {
        ChatRequest {
            request_id: "3f2b8c1e-5a0d-4b7e-9c11-2d6a8e4f7b90".into(),
            profile_id: "default".into(),
            messages: vec![WireMessage {
                role: Role::User,
                content: "hi".into(),
            }],
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
    }
}
