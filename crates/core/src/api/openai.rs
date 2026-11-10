//! OpenAI互換サーバー(`/chat/completions`・`/models`)。
//! LM Studio・Ollama・llama.cpp・vLLMなど。

use std::time::Instant;

use futures_util::StreamExt;
use reqwest::{RequestBuilder, Response};
use serde_json::{Value, json};
use tokio_util::sync::CancellationToken;

use super::connection::Connection;
use super::http::{describe_error, status_error};
use super::sse::SseLines;
use super::stats::StreamStats;
use super::types::{ChatEvent, Emit, GenerationParams, WireMessage};
use crate::error::AppError;

/// 返答を生成して、イベントを `emit` に流す。成功時と中断時は最後に `Done` を流す。
/// 失敗は `Err` で返す(`Error` イベントにするのは呼び出し側)。
pub async fn chat(
    client: &reqwest::Client,
    connection: &Connection,
    messages: &[WireMessage],
    params: GenerationParams,
    cancel: &CancellationToken,
    emit: Emit<'_>,
) -> Result<(), AppError> {
    let request = authorized(
        client.post(connection.endpoint("chat/completions")),
        connection,
    )
    .json(&chat_body(&connection.model, messages, params));

    // 応答の先頭が届くまでにも時間がかかる(プロンプト処理など)ため、ここも中断できるようにする
    let Some(sent) = cancel.run_until_cancelled(request.send()).await else {
        emit(ChatEvent::Done);
        return Ok(());
    };
    let response = sent.map_err(|e| describe_error(connection, &e))?;

    let status = response.status();
    if !status.is_success() {
        let text = response.text().await.unwrap_or_default();
        return Err(status_error(status, &text));
    }

    if is_json(&response) {
        // `stream: true` を無視して、通常のJSONで返すサーバーがある
        read_plain_reply(response, cancel, emit).await
    } else {
        read_event_stream(response, cancel, emit).await
    }
}

/// モデルIDの一覧(昇順)。
pub async fn list_models(
    client: &reqwest::Client,
    connection: &Connection,
) -> Result<Vec<String>, AppError> {
    let request = authorized(client.get(connection.endpoint("models")), connection);
    let response = request
        .send()
        .await
        .map_err(|e| describe_error(connection, &e))?;
    let status = response.status();
    if !status.is_success() {
        let text = response.text().await.unwrap_or_default();
        return Err(status_error(status, &text));
    }
    let value: Value = response
        .json()
        .await
        .map_err(|e| AppError::http(format!("応答を解析できませんでした: {e}")))?;
    Ok(parse_models(&value))
}

/// APIキーが設定されていれば、Bearerトークンとして付ける。
fn authorized(request: RequestBuilder, connection: &Connection) -> RequestBuilder {
    match connection.api_key.trim() {
        "" => request,
        key => request.bearer_auth(key),
    }
}

/// リクエスト本文。思考(reasoning)は含めない。
fn chat_body(model: &str, messages: &[WireMessage], params: GenerationParams) -> Value {
    let mut body = json!({
        "messages": messages,
        "stream": true,
        // 出力速度(tokens/s)のために、最後にトークン数を返してもらう
        "stream_options": { "include_usage": true },
    });
    let model = model.trim();
    if !model.is_empty() {
        body["model"] = json!(model);
    }
    if let Some(temperature) = params.temperature {
        body["temperature"] = json!(temperature);
    }
    if let Some(max_tokens) = params.max_tokens {
        body["max_tokens"] = json!(max_tokens);
    }
    body
}

fn parse_models(value: &Value) -> Vec<String> {
    let mut models: Vec<String> = value["data"]
        .as_array()
        .map(|items| {
            items
                .iter()
                .filter_map(|m| m["id"].as_str().map(str::to_owned))
                .collect()
        })
        .unwrap_or_default();
    models.sort();
    models
}

fn is_json(response: &Response) -> bool {
    response
        .headers()
        .get(reqwest::header::CONTENT_TYPE)
        .and_then(|v| v.to_str().ok())
        .is_some_and(|v| v.contains("application/json"))
}

async fn read_plain_reply(
    response: Response,
    cancel: &CancellationToken,
    emit: Emit<'_>,
) -> Result<(), AppError> {
    let Some(parsed) = cancel.run_until_cancelled(response.json::<Value>()).await else {
        emit(ChatEvent::Done);
        return Ok(());
    };
    let value = parsed.map_err(|e| AppError::http(format!("応答を解析できませんでした: {e}")))?;
    if let Some(message) = error_message(&value) {
        return Err(AppError::http(message));
    }
    for event in events_of(&value["choices"][0]["message"]) {
        emit(event);
    }
    emit(ChatEvent::Done);
    Ok(())
}

/// `[DONE]`、ストリームの終わり、または中断までSSEを読む。
async fn read_event_stream(
    response: Response,
    cancel: &CancellationToken,
    emit: Emit<'_>,
) -> Result<(), AppError> {
    let mut stream = response.bytes_stream();
    let mut lines = SseLines::new();
    let mut stats = StreamStats::default();

    'read: loop {
        let Some(next) = cancel.run_until_cancelled(stream.next()).await else {
            break;
        };
        let Some(chunk) = next else {
            // ストリームの終端。改行で終わらなかった最後の行を処理する
            if let Some(data) = lines.finish() {
                handle_data(&data, &mut stats, emit)?;
            }
            break;
        };
        let bytes = chunk.map_err(|e| {
            AppError::http(format!("ストリームの受信中にエラーが発生しました: {e}"))
        })?;
        for data in lines.push(&bytes) {
            if handle_data(&data, &mut stats, emit)? {
                break 'read;
            }
        }
    }

    if let Some(event) = stats.into_event() {
        emit(event);
    }
    emit(ChatEvent::Done);
    Ok(())
}

/// `data:` 行1件を処理する。`[DONE]` なら `true`。
fn handle_data(data: &str, stats: &mut StreamStats, emit: Emit<'_>) -> Result<bool, AppError> {
    if data == "[DONE]" {
        return Ok(true);
    }
    // 解釈できない行(キープアライブなど)は読み飛ばす
    let Ok(value) = serde_json::from_str::<Value>(data) else {
        return Ok(false);
    };
    if let Some(message) = error_message(&value) {
        return Err(AppError::http(message));
    }
    // `stream_options.include_usage` を付けると、最後に `choices` が空で `usage` だけのデータが届く
    if let Some(tokens) = value["usage"]["completion_tokens"].as_u64() {
        stats.record_usage(tokens);
    }
    let events = events_of(&value["choices"][0]["delta"]);
    if !events.is_empty() {
        stats.record_output(Instant::now());
    }
    for event in events {
        emit(event);
    }
    Ok(false)
}

fn error_message(value: &Value) -> Option<String> {
    let error = value.get("error")?;
    Some(
        error["message"]
            .as_str()
            .or_else(|| error.as_str())
            .map_or_else(|| "サーバーがエラーを返しました".to_owned(), str::to_owned),
    )
}

/// `delta`(または `message`)オブジェクトから、思考と本文のイベントを取り出す。
fn events_of(node: &Value) -> Vec<ChatEvent> {
    let mut events = Vec::new();
    // サーバーによって思考のフィールド名が違う: `reasoning_content`(DeepSeek・llama.cpp)か `reasoning`
    let reasoning = node["reasoning_content"]
        .as_str()
        .filter(|t| !t.is_empty())
        .or_else(|| node["reasoning"].as_str());
    if let Some(text) = reasoning.filter(|t| !t.is_empty()) {
        events.push(ChatEvent::Reasoning {
            text: text.to_owned(),
        });
    }
    if let Some(text) = node["content"].as_str().filter(|t| !t.is_empty()) {
        events.push(ChatEvent::Delta {
            text: text.to_owned(),
        });
    }
    events
}

#[cfg(test)]
mod tests {
    use std::time::Duration;

    use super::*;
    use crate::api::test_support::{json_response, serve_hanging, serve_once};
    use crate::api::types::{ProviderKind, Role};
    use crate::error::AppErrorKind;

    fn connection(base_url: &str) -> Connection {
        Connection {
            kind: ProviderKind::OpenAiCompatible,
            base_url: base_url.to_owned(),
            api_key: String::new(),
            model: String::new(),
        }
    }

    fn user(text: &str) -> Vec<WireMessage> {
        vec![WireMessage {
            role: Role::User,
            content: text.to_owned(),
        }]
    }

    /// `chat` を実行して、流れたイベントと結果を返す。
    async fn run(
        connection: &Connection,
        cancel: &CancellationToken,
    ) -> (Vec<ChatEvent>, Result<(), AppError>) {
        let client = crate::api::http::build_client().unwrap();
        let mut events = Vec::new();
        let result = chat(
            &client,
            connection,
            &user("hi"),
            GenerationParams::default(),
            cancel,
            &mut |e| events.push(e),
        )
        .await;
        (events, result)
    }

    fn delta(text: &str) -> ChatEvent {
        ChatEvent::Delta { text: text.into() }
    }

    fn reasoning(text: &str) -> ChatEvent {
        ChatEvent::Reasoning { text: text.into() }
    }

    #[test]
    fn chat_body_omits_the_model_when_blank_and_never_has_reasoning() {
        let body = chat_body("  ", &user("hi"), GenerationParams::default());
        assert_eq!(body["stream"], true);
        assert!(body.get("model").is_none());
        assert_eq!(
            body["messages"],
            json!([{ "role": "user", "content": "hi" }])
        );
        assert_eq!(
            chat_body(" m ", &user("hi"), GenerationParams::default())["model"],
            "m"
        );
        // 指定が無ければ、サーバーの既定に任せる
        assert!(body.get("temperature").is_none());
        assert!(body.get("max_tokens").is_none());
    }

    #[test]
    fn chat_body_asks_for_the_usage_at_the_end_of_the_stream() {
        let body = chat_body("m", &user("hi"), GenerationParams::default());

        assert_eq!(body["stream_options"]["include_usage"], true);
    }

    #[test]
    fn the_usage_data_is_recorded_without_emitting_anything() {
        let mut stats = StreamStats::default();
        let mut events = Vec::new();

        let done = handle_data(
            r#"{"choices":[],"usage":{"prompt_tokens":9,"completion_tokens":42}}"#,
            &mut stats,
            &mut |e| events.push(e),
        )
        .unwrap();

        assert!(!done);
        assert!(events.is_empty());
        assert_eq!(stats.reported_tokens(), Some(42));
    }

    #[test]
    fn chat_body_carries_the_generation_params_when_set() {
        let params = GenerationParams {
            temperature: Some(0.5),
            max_tokens: Some(256),
        };

        let body = chat_body("m", &user("hi"), params);

        assert_eq!(body["temperature"], 0.5);
        assert_eq!(body["max_tokens"], 256);
    }

    #[test]
    fn events_prefer_reasoning_content_over_reasoning() {
        let node = json!({ "reasoning_content": "a", "reasoning": "b", "content": "c" });
        assert_eq!(events_of(&node), [reasoning("a"), delta("c")]);
        let node = json!({ "reasoning_content": "", "reasoning": "b", "content": null });
        assert_eq!(events_of(&node), [reasoning("b")]);
        assert!(events_of(&json!({ "role": "assistant" })).is_empty());
    }

    #[test]
    fn models_are_sorted_and_missing_data_is_empty() {
        let value = json!({ "data": [{ "id": "zeta" }, { "id": "alpha" }, {}] });
        assert_eq!(parse_models(&value), ["alpha", "zeta"]);
        assert!(parse_models(&json!({})).is_empty());
    }

    #[tokio::test]
    async fn streams_sse_deltas_and_reasoning_in_order() {
        let (url, server) = serve_once(
            "HTTP/1.1 200 OK\r\nContent-Type: text/event-stream\r\nConnection: close\r\n\r\n\
             data: {\"choices\":[{\"delta\":{\"role\":\"assistant\"}}]}\n\n\
             data: {\"choices\":[{\"delta\":{\"reasoning_content\":\"考え\"}}]}\n\n\
             data: {\"choices\":[{\"delta\":{\"reasoning\":\"中\",\"content\":null}}]}\n\n\
             data: {\"choices\":[{\"delta\":{\"content\":\"こん\"}}]}\n\n\
             data: {\"choices\":[{\"delta\":{\"content\":\"にちは\"}}]}\n\n\
             data: [DONE]\n\n"
                .to_owned(),
        );
        let mut connection = connection(&url);
        connection.api_key = "secret".into();
        connection.model = "m".into();

        let (events, result) = run(&connection, &CancellationToken::new()).await;

        assert_eq!(result, Ok(()));
        assert_eq!(
            events,
            [
                reasoning("考え"),
                reasoning("中"),
                delta("こん"),
                delta("にちは"),
                ChatEvent::Done,
            ]
        );
        let request = server.join().unwrap();
        assert!(
            request.starts_with("POST /v1/chat/completions"),
            "{request}"
        );
        assert!(
            request
                .to_ascii_lowercase()
                .contains("authorization: bearer secret"),
            "{request}"
        );
        assert!(
            request.contains("\"stream\":true") && request.contains("\"model\":\"m\""),
            "{request}"
        );
    }

    #[tokio::test]
    async fn a_last_line_without_a_newline_is_still_read() {
        let (url, server) = serve_once(
            "HTTP/1.1 200 OK\r\nContent-Type: text/event-stream\r\nConnection: close\r\n\r\n\
             data: {\"choices\":[{\"delta\":{\"content\":\"end\"}}]}"
                .to_owned(),
        );

        let (events, result) = run(&connection(&url), &CancellationToken::new()).await;

        assert_eq!(result, Ok(()));
        assert_eq!(events, [delta("end"), ChatEvent::Done]);
        server.join().unwrap();
    }

    #[tokio::test]
    async fn plain_json_reply_keeps_reasoning_separate() {
        let body = r#"{"choices":[{"message":{"reasoning_content":"think","content":"answer"}}]}"#;
        let (url, server) = serve_once(json_response("200 OK", body));

        let (events, result) = run(&connection(&url), &CancellationToken::new()).await;

        assert_eq!(result, Ok(()));
        assert_eq!(
            events,
            [reasoning("think"), delta("answer"), ChatEvent::Done]
        );
        server.join().unwrap();
    }

    #[tokio::test]
    async fn http_errors_carry_the_server_message() {
        let body = r#"{"error":{"message":"model not loaded"}}"#;
        let (url, server) = serve_once(json_response("500 Internal Server Error", body));

        let (events, result) = run(&connection(&url), &CancellationToken::new()).await;

        let error = result.unwrap_err();
        assert_eq!(error.kind, AppErrorKind::Http);
        assert!(
            error.message.contains("500") && error.message.contains("model not loaded"),
            "{error}"
        );
        assert!(events.is_empty());
        server.join().unwrap();
    }

    #[tokio::test]
    async fn an_error_inside_the_stream_fails_the_request() {
        let (url, server) = serve_once(
            "HTTP/1.1 200 OK\r\nContent-Type: text/event-stream\r\nConnection: close\r\n\r\n\
             data: {\"choices\":[{\"delta\":{\"content\":\"a\"}}]}\n\n\
             data: {\"error\":{\"message\":\"out of memory\"}}\n\n"
                .to_owned(),
        );

        let (events, result) = run(&connection(&url), &CancellationToken::new()).await;

        assert_eq!(events, [delta("a")]);
        assert!(result.unwrap_err().message.contains("out of memory"));
        server.join().unwrap();
    }

    #[tokio::test]
    async fn connection_failure_is_explained() {
        // ポート1はほぼ確実に待ち受けていない
        let (events, result) = run(
            &connection("http://127.0.0.1:1/v1"),
            &CancellationToken::new(),
        )
        .await;

        let error = result.unwrap_err();
        assert_eq!(error.kind, AppErrorKind::ConnectionFailed);
        assert!(error.message.contains("接続できません"), "{error}");
        assert!(events.is_empty());
    }

    #[tokio::test]
    async fn cancelling_mid_stream_ends_with_done() {
        let (url, server) = serve_hanging(
            "HTTP/1.1 200 OK\r\nContent-Type: text/event-stream\r\n\r\n\
             data: {\"choices\":[{\"delta\":{\"content\":\"a\"}}]}\n\n"
                .to_owned(),
        );
        let cancel = CancellationToken::new();
        let canceller = cancel.clone();
        tokio::spawn(async move {
            tokio::time::sleep(Duration::from_millis(300)).await;
            canceller.cancel();
        });

        let (events, result) =
            tokio::time::timeout(Duration::from_secs(10), run(&connection(&url), &cancel))
                .await
                .expect("中断してもストリームが終わらない");

        assert_eq!(result, Ok(()));
        assert_eq!(events, [delta("a"), ChatEvent::Done]);
        drop(server);
    }

    #[tokio::test]
    async fn cancelling_before_the_response_ends_with_done() {
        let (url, server) = serve_hanging(String::new());
        let cancel = CancellationToken::new();
        let canceller = cancel.clone();
        tokio::spawn(async move {
            tokio::time::sleep(Duration::from_millis(300)).await;
            canceller.cancel();
        });

        let (events, result) =
            tokio::time::timeout(Duration::from_secs(10), run(&connection(&url), &cancel))
                .await
                .expect("中断してもリクエストが終わらない");

        assert_eq!(result, Ok(()));
        assert_eq!(events, [ChatEvent::Done]);
        drop(server);
    }

    #[tokio::test]
    async fn lists_models_sorted() {
        let body = r#"{"data":[{"id":"zeta"},{"id":"alpha"}]}"#;
        let (url, server) = serve_once(json_response("200 OK", body));
        let client = crate::api::http::build_client().unwrap();

        let models = list_models(&client, &connection(&format!("{url}/")))
            .await
            .unwrap();

        assert_eq!(models, ["alpha", "zeta"]);
        assert!(server.join().unwrap().starts_with("GET /v1/models"));
    }
}
