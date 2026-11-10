//! LLMサーバーへのAPI呼び出し。
//!
//! 設定やプロファイルの一覧は知らない。呼び出し側が [`Connection`] を組み立てて渡す。
//! 対応先を増やすときは [`ProviderKind`] にバリアントを足し、実装を追加して [`ApiClient`] の
//! `match` に分岐を足す(⑥のAnthropic)。

mod active;
mod connection;
mod http;
mod openai;
mod sse;
#[cfg(test)]
mod test_support;
mod types;

pub use active::{ActiveGuard, ActiveRequests};
pub use connection::Connection;
pub use types::{ChatEvent, Emit, GenerationParams, ProviderKind, Role, WireMessage};

use std::time::Duration;

use tokio_util::sync::CancellationToken;

use crate::error::{AppError, AppErrorKind};

/// HTTPクライアントと、実行中のリクエストをまとめたもの。アプリで1つ作って共有する。
pub struct ApiClient {
    http: reqwest::Client,
    active: ActiveRequests,
}

impl ApiClient {
    pub fn new() -> Result<Self, AppError> {
        Ok(Self {
            http: http::build_client()?,
            active: ActiveRequests::default(),
        })
    }

    /// 返答を生成し、イベントを `emit` に流す。
    ///
    /// 終わりには必ず `Done`(中断を含む)か `Error`(日本語のメッセージ)のどちらかを1回流す。
    pub async fn chat(
        &self,
        request_id: &str,
        connection: &Connection,
        messages: &[WireMessage],
        params: GenerationParams,
        mut emit: impl FnMut(ChatEvent) + Send,
    ) {
        let guard = self.active.register(request_id);
        let result = match connection.kind {
            ProviderKind::OpenAiCompatible => {
                openai::chat(
                    &self.http,
                    connection,
                    messages,
                    params,
                    guard.token(),
                    &mut emit,
                )
                .await
            }
        };
        if let Err(error) = result {
            emit(ChatEvent::Error {
                message: error.message,
            });
        }
    }

    /// 返答を最後まで受け取って、本文だけを返す(タイトル作りなど、画面に流さない用途)。
    /// 思考は含めない。`timeout` を過ぎたら中断して失敗にする。
    pub async fn complete(
        &self,
        connection: &Connection,
        messages: &[WireMessage],
        timeout: Duration,
    ) -> Result<String, AppError> {
        let cancel = CancellationToken::new();
        let mut text = String::new();
        let mut collect = |event: ChatEvent| {
            if let ChatEvent::Delta { text: delta } = event {
                text.push_str(&delta);
            }
        };
        let request = match connection.kind {
            ProviderKind::OpenAiCompatible => openai::chat(
                &self.http,
                connection,
                messages,
                GenerationParams::default(),
                &cancel,
                &mut collect,
            ),
        };
        match tokio::time::timeout(timeout, request).await {
            Ok(result) => result?,
            Err(_) => {
                return Err(AppError::new(
                    AppErrorKind::Timeout,
                    "サーバーからの応答がタイムアウトしました。",
                ));
            }
        }
        Ok(text)
    }

    /// 実行中のリクエストを中断する。
    pub fn cancel(&self, request_id: &str) -> bool {
        self.active.cancel(request_id)
    }

    /// サーバーのモデルID一覧。接続テストにも使う。
    pub async fn list_models(&self, connection: &Connection) -> Result<Vec<String>, AppError> {
        match connection.kind {
            ProviderKind::OpenAiCompatible => openai::list_models(&self.http, connection).await,
        }
    }
}

#[cfg(test)]
mod tests {
    use super::test_support::serve_once;
    use super::*;

    fn connection(base_url: &str) -> Connection {
        Connection {
            kind: ProviderKind::OpenAiCompatible,
            base_url: base_url.to_owned(),
            api_key: String::new(),
            model: String::new(),
        }
    }

    fn user() -> Vec<WireMessage> {
        vec![WireMessage {
            role: Role::User,
            content: "hi".into(),
        }]
    }

    #[tokio::test]
    async fn failures_become_a_single_terminal_error_event() {
        let api = ApiClient::new().unwrap();
        let mut events = Vec::new();

        api.chat(
            "r1",
            &connection("http://127.0.0.1:1/v1"),
            &user(),
            GenerationParams::default(),
            |e| events.push(e),
        )
        .await;

        assert_eq!(events.len(), 1);
        assert!(
            matches!(&events[0], ChatEvent::Error { message } if message.contains("接続できません"))
        );
    }

    #[tokio::test]
    async fn complete_joins_the_text_and_leaves_out_reasoning() {
        let (url, server) = serve_once(
            "HTTP/1.1 200 OK\r\nContent-Type: text/event-stream\r\nConnection: close\r\n\r\n\
             data: {\"choices\":[{\"delta\":{\"reasoning_content\":\"考え\"}}]}\n\n\
             data: {\"choices\":[{\"delta\":{\"content\":\"京都\"}}]}\n\n\
             data: {\"choices\":[{\"delta\":{\"content\":\"旅行\"}}]}\n\n\
             data: [DONE]\n\n"
                .to_owned(),
        );
        let api = ApiClient::new().unwrap();

        let text = api
            .complete(&connection(&url), &user(), Duration::from_secs(10))
            .await
            .unwrap();

        assert_eq!(text, "京都旅行");
        server.join().unwrap();
    }

    #[tokio::test]
    async fn complete_fails_when_the_server_does() {
        let api = ApiClient::new().unwrap();

        let error = api
            .complete(
                &connection("http://127.0.0.1:1/v1"),
                &user(),
                Duration::from_secs(10),
            )
            .await
            .unwrap_err();

        assert_eq!(error.kind, AppErrorKind::ConnectionFailed);
    }

    #[tokio::test]
    async fn complete_gives_up_after_the_timeout() {
        let (url, server) = super::test_support::serve_hanging(
            "HTTP/1.1 200 OK\r\nContent-Type: text/event-stream\r\n\r\n".to_owned(),
        );
        let api = ApiClient::new().unwrap();

        let error = api
            .complete(&connection(&url), &user(), Duration::from_millis(300))
            .await
            .unwrap_err();

        assert_eq!(error.kind, AppErrorKind::Timeout);
        drop(server);
    }

    #[tokio::test]
    async fn success_ends_with_done_and_unregisters_the_request() {
        let (url, server) = serve_once(
            "HTTP/1.1 200 OK\r\nContent-Type: text/event-stream\r\nConnection: close\r\n\r\n\
             data: {\"choices\":[{\"delta\":{\"content\":\"a\"}}]}\n\ndata: [DONE]\n\n"
                .to_owned(),
        );
        let api = ApiClient::new().unwrap();
        let mut events = Vec::new();

        api.chat(
            "r1",
            &connection(&url),
            &user(),
            GenerationParams::default(),
            |e| events.push(e),
        )
        .await;

        assert_eq!(
            events,
            [ChatEvent::Delta { text: "a".into() }, ChatEvent::Done]
        );
        assert!(!api.cancel("r1"));
        server.join().unwrap();
    }
}
