//! プロバイダ実装で共有するHTTPの補助。

use std::time::Duration;

use serde_json::Value;

use super::connection::Connection;
use crate::error::{AppError, AppErrorKind};

/// HTTPクライアントを作る。
///
/// 接続タイムアウトだけを付け、全体のタイムアウトは付けない。ストリーミングの応答や、
/// ローカルLLMの遅いプロンプト処理が数分かかることがあるため。中断は呼び出し側が行う。
pub fn build_client() -> Result<reqwest::Client, AppError> {
    reqwest::Client::builder()
        .connect_timeout(Duration::from_secs(10))
        .build()
        .map_err(|e| AppError::internal(format!("HTTPクライアントを初期化できませんでした: {e}")))
}

/// 通信レベルの失敗を、ユーザーが対処できるメッセージにする。
pub fn describe_error(connection: &Connection, error: &reqwest::Error) -> AppError {
    if error.is_builder() {
        AppError::new(
            AppErrorKind::InvalidUrl,
            format!("URLが正しくありません: {}", connection.base_url.trim()),
        )
    } else if error.is_connect() {
        AppError::new(
            AppErrorKind::ConnectionFailed,
            format!(
                "サーバーに接続できません({})。サーバーが起動しているか、設定のURLを確認してください。",
                connection.base_url.trim()
            ),
        )
    } else if error.is_timeout() {
        AppError::new(
            AppErrorKind::Timeout,
            "サーバーからの応答がタイムアウトしました。",
        )
    } else {
        AppError::http(format!("リクエストに失敗しました: {error}"))
    }
}

/// エラー応答の本文から、読みやすいメッセージを取り出す。
pub fn extract_error(body: &str) -> String {
    if let Ok(value) = serde_json::from_str::<Value>(body)
        && let Some(message) = value["error"]["message"]
            .as_str()
            .or_else(|| value["error"].as_str())
    {
        return message.to_owned();
    }
    let body = body.trim();
    if body.is_empty() {
        "(本文なし)".to_owned()
    } else if body.chars().count() > 300 {
        format!("{}…", body.chars().take(300).collect::<String>())
    } else {
        body.to_owned()
    }
}

/// HTTPのエラー応答をエラーにする。
pub fn status_error(status: reqwest::StatusCode, body: &str) -> AppError {
    AppError::http(format!(
        "サーバーがエラーを返しました(HTTP {}): {}",
        status.as_u16(),
        extract_error(body)
    ))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn extracts_the_message_from_an_openai_error_body() {
        assert_eq!(
            extract_error(r#"{"error":{"message":"model not loaded"}}"#),
            "model not loaded"
        );
        assert_eq!(extract_error(r#"{"error":"bad"}"#), "bad");
    }

    #[test]
    fn falls_back_to_the_plain_body_and_truncates_long_ones() {
        assert_eq!(extract_error("  oops  "), "oops");
        assert_eq!(extract_error(""), "(本文なし)");
        let long = "あ".repeat(400);
        let text = extract_error(&long);
        assert_eq!(text.chars().count(), 301);
        assert!(text.ends_with('…'));
    }
}
