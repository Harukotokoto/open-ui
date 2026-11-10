//! 会話のタイトル。純粋関数だけを置く。

use serde_json::Value;

use crate::error::AppError;

/// 自動で付けるタイトルの最大文字数(これを超えたら `…` を付けて切る)。
const AUTO_TITLE_CHARS: usize = 30;
/// 名前を変えるときの最大文字数。
pub(super) const MAX_TITLE_CHARS: usize = 100;
/// 本文から作れないときのタイトル。
const FALLBACK_TITLE: &str = "新しい会話";

/// 最初のユーザーメッセージから作る。空白(改行を含む)は1つの空白にまとめ、長ければ切る。
pub(super) fn derive_title(messages: &[Value]) -> String {
    let text = messages
        .iter()
        .find(|message| message["role"] == "user")
        .map(message_text)
        .unwrap_or_default();
    let collapsed = collapse_whitespace(&text);
    if collapsed.is_empty() {
        return FALLBACK_TITLE.to_owned();
    }
    shorten(&collapsed)
}

/// 空白を整えたあとの文字列を、長ければ切って `…` を付ける。AIが作ったタイトルにも使う。
pub(super) fn shorten(collapsed: &str) -> String {
    if collapsed.chars().count() <= AUTO_TITLE_CHARS {
        return collapsed.to_owned();
    }
    let mut title: String = collapsed.chars().take(AUTO_TITLE_CHARS).collect();
    title.truncate(title.trim_end().len());
    title.push('…');
    title
}

/// 名前変更の入力を検査して整える(前後の空白を除き、改行などを空白1つにする)。
pub(super) fn normalize_title(input: &str) -> Result<String, AppError> {
    let title = collapse_whitespace(input);
    if title.is_empty() {
        return Err(AppError::invalid_input("名前を入力してください"));
    }
    if title.chars().count() > MAX_TITLE_CHARS {
        return Err(AppError::invalid_input(format!(
            "名前は{MAX_TITLE_CHARS}文字以内にしてください"
        )));
    }
    Ok(title)
}

/// メッセージのtextパーツをつないだもの。
pub(super) fn message_text(message: &Value) -> String {
    message["parts"]
        .as_array()
        .into_iter()
        .flatten()
        .filter(|part| part["type"] == "text")
        .filter_map(|part| part["text"].as_str())
        .collect()
}

pub(super) fn collapse_whitespace(text: &str) -> String {
    text.split_whitespace().collect::<Vec<_>>().join(" ")
}

#[cfg(test)]
mod tests {
    use serde_json::json;

    use super::*;
    use crate::error::AppErrorKind;

    fn user(text: &str) -> Value {
        json!({"id": "u", "role": "user", "parts": [{"type": "text", "text": text}]})
    }

    fn assistant(text: &str) -> Value {
        json!({"id": "a", "role": "assistant", "parts": [{"type": "text", "text": text}]})
    }

    #[test]
    fn the_title_comes_from_the_first_user_message() {
        let messages = [user("Rustのライフタイムについて教えて"), assistant("はい")];
        assert_eq!(derive_title(&messages), "Rustのライフタイムについて教えて");
    }

    #[test]
    fn whitespace_and_newlines_are_collapsed() {
        assert_eq!(
            derive_title(&[user("  こんにちは \n\n 世界\t")]),
            "こんにちは 世界"
        );
    }

    #[test]
    fn long_titles_are_cut_with_an_ellipsis() {
        let exactly = "あ".repeat(30);
        assert_eq!(derive_title(&[user(&exactly)]), exactly);

        let long = "あ".repeat(31);
        assert_eq!(
            derive_title(&[user(&long)]),
            format!("{}…", "あ".repeat(30))
        );
    }

    #[test]
    fn a_trailing_space_is_not_left_before_the_ellipsis() {
        let text = format!("{} {}", "a".repeat(29), "b".repeat(10));
        assert_eq!(derive_title(&[user(&text)]), format!("{}…", "a".repeat(29)));
    }

    #[test]
    fn non_text_parts_are_ignored() {
        let message = json!({"id": "u", "role": "user", "parts": [
            {"type": "reasoning", "text": "考え"},
            {"type": "text", "text": "質問"},
            {"type": "file", "url": "x"},
        ]});
        assert_eq!(derive_title(&[message]), "質問");
    }

    #[test]
    fn without_a_usable_user_message_the_fallback_is_used() {
        assert_eq!(derive_title(&[]), "新しい会話");
        assert_eq!(derive_title(&[assistant("先に話した")]), "新しい会話");
        assert_eq!(derive_title(&[user("  \n ")]), "新しい会話");
    }

    #[test]
    fn a_rename_is_trimmed_and_collapsed() {
        assert_eq!(normalize_title("  旅行の  計画\n").unwrap(), "旅行の 計画");
    }

    #[test]
    fn blank_and_too_long_names_are_rejected() {
        assert_eq!(
            normalize_title("  ").unwrap_err().kind,
            AppErrorKind::InvalidInput
        );
        assert!(normalize_title(&"あ".repeat(100)).is_ok());
        assert!(normalize_title(&"あ".repeat(101)).is_err());
    }
}
