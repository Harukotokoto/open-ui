//! 保存された接続先1件。

use serde::{Deserialize, Serialize};
use specta::Type;

use super::url::validate_base_url;
use crate::api::{Connection, ProviderKind};
use crate::error::AppError;

/// 最初に1件だけ持つプロファイルのID。
pub const DEFAULT_PROFILE_ID: &str = "default";

const MAX_NAME_CHARS: usize = 60;

/// 名前を付けたサーバー(LM Studio・Ollama など)。
///
/// APIキーはフィールドに持たない。OSの資格情報ストアに、`id` から決まるアカウント名で保存する
/// (→ `ProfileKeys`)。そのため、プロファイルをシリアライズしてもキーが書き出されることはない。
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct ConnectionProfile {
    /// 名前を変えても変わらない。キーなどがこのIDを参照する
    pub id: String,
    pub name: String,
    #[serde(default)]
    pub kind: ProviderKind,
    /// APIのベースURL(例: `http://localhost:1234/v1`)
    pub base_url: String,
    /// このサーバーで使うモデル。`None` ならサーバーの既定に任せる
    #[serde(default)]
    pub selected_model: Option<String>,
}

impl ConnectionProfile {
    /// 初回起動時に持つ、LM Studio向けのプロファイル。
    pub fn lm_studio() -> Self {
        Self {
            id: DEFAULT_PROFILE_ID.to_owned(),
            name: "LM Studio".to_owned(),
            kind: ProviderKind::OpenAiCompatible,
            base_url: "http://localhost:1234/v1".to_owned(),
            selected_model: None,
        }
    }

    /// 入力を検査し、保存する形に整える(名前・モデル名の空白を除き、URLを正規化する)。
    pub fn validated(&self) -> Result<Self, AppError> {
        let name = self.name.trim();
        if name.is_empty() {
            return Err(AppError::invalid_input("名前を入力してください"));
        }
        if name.chars().count() > MAX_NAME_CHARS {
            return Err(AppError::invalid_input(format!(
                "名前は{MAX_NAME_CHARS}文字以内にしてください"
            )));
        }
        let selected_model = self
            .selected_model
            .as_deref()
            .map(str::trim)
            .filter(|m| !m.is_empty())
            .map(str::to_owned);
        Ok(Self {
            id: self.id.clone(),
            name: name.to_owned(),
            kind: self.kind,
            base_url: validate_base_url(&self.base_url)?,
            selected_model,
        })
    }

    /// リクエストに必要な接続情報。APIキーはメモリ上にだけ持つ。
    pub fn connection(&self, api_key: &str) -> Connection {
        Connection {
            kind: self.kind,
            base_url: self.base_url.clone(),
            api_key: api_key.to_owned(),
            model: self.selected_model.clone().unwrap_or_default(),
        }
    }
}

/// IDとして使える文字列か(ASCIIの英数字・`-`・`_`、1〜64文字)。
pub fn is_valid_id(id: &str) -> bool {
    !id.is_empty()
        && id.len() <= 64
        && id
            .chars()
            .all(|c| c.is_ascii_alphanumeric() || c == '-' || c == '_')
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::error::AppErrorKind;

    fn profile() -> ConnectionProfile {
        ConnectionProfile {
            id: "a".into(),
            name: "A".into(),
            kind: ProviderKind::OpenAiCompatible,
            base_url: "http://a/v1".into(),
            selected_model: None,
        }
    }

    #[test]
    fn the_default_profile_points_at_lm_studio() {
        let profile = ConnectionProfile::lm_studio();
        assert_eq!(profile.id, DEFAULT_PROFILE_ID);
        assert_eq!(profile.base_url, "http://localhost:1234/v1");
        assert!(is_valid_id(&profile.id));
    }

    #[test]
    fn validation_trims_and_normalizes() {
        let input = ConnectionProfile {
            name: "  自宅 ".into(),
            base_url: " http://a/v1/ ".into(),
            selected_model: Some("  llama3 ".into()),
            ..profile()
        };

        let output = input.validated().unwrap();

        assert_eq!(output.name, "自宅");
        assert_eq!(output.base_url, "http://a/v1");
        assert_eq!(output.selected_model.as_deref(), Some("llama3"));
    }

    #[test]
    fn a_blank_model_means_the_server_default() {
        let input = ConnectionProfile {
            selected_model: Some("   ".into()),
            ..profile()
        };
        assert_eq!(input.validated().unwrap().selected_model, None);
    }

    #[test]
    fn blank_and_too_long_names_are_rejected() {
        let blank = ConnectionProfile {
            name: "  ".into(),
            ..profile()
        };
        assert_eq!(
            blank.validated().unwrap_err().kind,
            AppErrorKind::InvalidInput
        );
        let long = ConnectionProfile {
            name: "あ".repeat(61),
            ..profile()
        };
        assert!(long.validated().is_err());
    }

    #[test]
    fn an_invalid_url_is_rejected() {
        let input = ConnectionProfile {
            base_url: "localhost".into(),
            ..profile()
        };
        assert_eq!(
            input.validated().unwrap_err().kind,
            AppErrorKind::InvalidUrl
        );
    }

    #[test]
    fn connection_carries_url_key_and_model() {
        let profile = ConnectionProfile {
            selected_model: Some("llama3".into()),
            ..profile()
        };

        let connection = profile.connection("k");

        assert_eq!(connection.base_url, "http://a/v1");
        assert_eq!(connection.api_key, "k");
        assert_eq!(connection.model, "llama3");
        assert_eq!(connection.kind, ProviderKind::OpenAiCompatible);
    }

    #[test]
    fn no_selected_model_means_an_empty_model_name() {
        assert_eq!(profile().connection("").model, "");
    }

    #[test]
    fn a_serialized_profile_has_no_key_field() {
        let text = serde_json::to_string(&profile()).unwrap();
        assert!(!text.to_ascii_lowercase().contains("key"), "{text}");
    }

    #[test]
    fn ids_allow_only_ascii_alphanumerics_hyphen_and_underscore() {
        assert!(is_valid_id("default"));
        assert!(is_valid_id("a-B_9"));
        assert!(!is_valid_id(""));
        assert!(!is_valid_id("a b"));
        assert!(!is_valid_id("../x"));
        assert!(!is_valid_id("日本語"));
        assert!(!is_valid_id(&"a".repeat(65)));
    }
}
