//! 接続プロファイルのベースURLの検査。

use reqwest::Url;

use crate::error::{AppError, AppErrorKind};

/// 保存するURL(前後の空白と末尾のスラッシュを除いたもの)を返す。不正ならユーザー向けのエラー。
pub fn validate_base_url(input: &str) -> Result<String, AppError> {
    let invalid = |message: &str| Err(AppError::new(AppErrorKind::InvalidUrl, message));

    let text = input.trim();
    if text.is_empty() {
        return invalid("URLを入力してください");
    }
    if text.chars().any(char::is_whitespace) {
        return invalid("URLに空白を含めることはできません");
    }
    let Ok(url) = Url::parse(text) else {
        return invalid(&not_a_url(text));
    };
    if !matches!(url.scheme(), "http" | "https") {
        return invalid(&not_a_url(text));
    }
    // `http:///v1` は "v1" がホストとして解釈されるが、意図はホストの欠落
    let after_scheme = text.split_once("://").map_or("", |(_, rest)| rest);
    if after_scheme.starts_with('/') || url.host_str().is_none_or(str::is_empty) {
        return invalid("URLにホスト名がありません");
    }
    if url.query().is_some() || url.fragment().is_some() {
        return invalid("URLに「?」や「#」を含めることはできません");
    }
    // 認証情報はエラーメッセージやログに出てしまうため、URLには入れさせない
    if !url.username().is_empty() || url.password().is_some() {
        return invalid(
            "URLにユーザー名やパスワードを含めることはできません。APIキーの欄に入力してください",
        );
    }
    Ok(text.trim_end_matches('/').to_owned())
}

fn not_a_url(text: &str) -> String {
    if text.contains("://") {
        "URLはhttp://またはhttps://で始めてください".to_owned()
    } else {
        "URLの形式が正しくありません。http://localhost:1234/v1のように入力してください".to_owned()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn accepts_http_and_https_and_trims() {
        assert_eq!(
            validate_base_url("  http://localhost:1234/v1  ").unwrap(),
            "http://localhost:1234/v1"
        );
        assert_eq!(
            validate_base_url("https://api.example.com/v1").unwrap(),
            "https://api.example.com/v1"
        );
    }

    #[test]
    fn trailing_slashes_are_removed() {
        assert_eq!(
            validate_base_url("http://localhost:1234/v1//").unwrap(),
            "http://localhost:1234/v1"
        );
        assert_eq!(
            validate_base_url("http://localhost:1234/").unwrap(),
            "http://localhost:1234"
        );
    }

    #[test]
    fn blank_input_is_rejected() {
        assert!(validate_base_url("").is_err());
        assert!(validate_base_url("   ").is_err());
    }

    #[test]
    fn other_schemes_and_bare_hosts_are_rejected() {
        assert!(validate_base_url("ftp://example.com/v1").is_err());
        assert!(validate_base_url("localhost:1234/v1").is_err());
        assert!(validate_base_url("example.com").is_err());
        assert!(validate_base_url("file:///tmp/x").is_err());
    }

    #[test]
    fn missing_host_is_rejected() {
        assert!(validate_base_url("http://").is_err());
        assert!(validate_base_url("http:///v1").is_err());
    }

    #[test]
    fn whitespace_inside_is_rejected() {
        assert!(validate_base_url("http://local host/v1").is_err());
    }

    #[test]
    fn query_and_fragment_are_rejected() {
        assert!(validate_base_url("http://localhost/v1?x=1").is_err());
        assert!(validate_base_url("http://localhost/v1#top").is_err());
    }

    #[test]
    fn credentials_in_the_url_are_rejected() {
        assert!(validate_base_url("http://user:pass@localhost/v1").is_err());
        assert!(validate_base_url("http://user@localhost/v1").is_err());
    }

    #[test]
    fn errors_are_invalid_url_errors() {
        assert_eq!(
            validate_base_url("").unwrap_err().kind,
            AppErrorKind::InvalidUrl
        );
    }
}
