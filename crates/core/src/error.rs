//! フロントへ返すエラー。
//!
//! メッセージはユーザー向けの日本語。秘密情報やリクエスト本文は含めない。

use std::fmt;

use serde::Serialize;
use specta::Type;

/// エラーの種別。フロントが表示の出し分けに使える。
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Type)]
#[serde(rename_all = "camelCase")]
pub enum AppErrorKind {
    /// サーバーに接続できない
    ConnectionFailed,
    /// URLが正しくない
    InvalidUrl,
    /// 応答がタイムアウトした
    Timeout,
    /// サーバーがエラーを返した、または応答を解釈できない
    Http,
    /// 入力値が正しくない
    InvalidInput,
    /// 対象が見つからない
    NotFound,
    /// 設定ファイルなどの読み書きに失敗した
    Storage,
    /// OSの資格情報ストアを利用できない
    Secret,
    /// 想定外の内部エラー
    Internal,
}

/// IPCコマンドが返すエラー。
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct AppError {
    pub kind: AppErrorKind,
    pub message: String,
}

impl AppError {
    pub fn new(kind: AppErrorKind, message: impl Into<String>) -> Self {
        Self {
            kind,
            message: message.into(),
        }
    }

    pub fn invalid_input(message: impl Into<String>) -> Self {
        Self::new(AppErrorKind::InvalidInput, message)
    }

    pub fn not_found(message: impl Into<String>) -> Self {
        Self::new(AppErrorKind::NotFound, message)
    }

    pub fn storage(message: impl Into<String>) -> Self {
        Self::new(AppErrorKind::Storage, message)
    }

    pub fn http(message: impl Into<String>) -> Self {
        Self::new(AppErrorKind::Http, message)
    }

    pub fn internal(message: impl Into<String>) -> Self {
        Self::new(AppErrorKind::Internal, message)
    }
}

impl fmt::Display for AppError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        f.write_str(&self.message)
    }
}

impl std::error::Error for AppError {}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn serializes_kind_and_message_in_camel_case() {
        let json =
            serde_json::to_string(&AppError::new(AppErrorKind::ConnectionFailed, "失敗")).unwrap();
        assert_eq!(json, r#"{"kind":"connectionFailed","message":"失敗"}"#);
    }
}
