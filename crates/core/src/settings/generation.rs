//! 生成の設定(全プロファイル共通)。システムプロンプト・temperature・最大トークン数。

use serde::{Deserialize, Serialize};
use specta::Type;

use crate::api::{GenerationParams, Role, WireMessage};
use crate::error::AppError;

/// システムプロンプトの最大文字数。
pub const MAX_SYSTEM_PROMPT_CHARS: usize = 20_000;
/// temperatureの範囲(OpenAI互換APIの一般的な範囲)。
const TEMPERATURE_RANGE: std::ops::RangeInclusive<f32> = 0.0..=2.0;

/// 生成の設定。項目を足すときは `#[serde(default)]` で埋まるようにする(versionは上げない)。
#[derive(Debug, Clone, Default, PartialEq, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase", default)]
pub struct GenerationSettings {
    /// 空なら付けない
    pub system_prompt: String,
    /// `None` ならサーバーの既定
    pub temperature: Option<f32>,
    /// `None` ならサーバーの既定
    pub max_tokens: Option<u32>,
}

impl GenerationSettings {
    /// 保存してよい値か確かめる。
    pub fn validate(&self) -> Result<(), AppError> {
        if self.system_prompt.chars().count() > MAX_SYSTEM_PROMPT_CHARS {
            return Err(AppError::invalid_input(format!(
                "システムプロンプトは{MAX_SYSTEM_PROMPT_CHARS}文字以内にしてください"
            )));
        }
        if let Some(temperature) = self.temperature
            && !TEMPERATURE_RANGE.contains(&temperature)
        {
            return Err(AppError::invalid_input(
                "temperatureは0〜2の範囲で指定してください",
            ));
        }
        if self.max_tokens == Some(0) {
            return Err(AppError::invalid_input(
                "最大トークン数は1以上にしてください",
            ));
        }
        Ok(())
    }

    /// リクエストに付けるパラメーター。
    pub fn params(&self) -> GenerationParams {
        GenerationParams {
            temperature: self.temperature,
            max_tokens: self.max_tokens,
        }
    }

    /// システムプロンプトと書式の説明(`guide`)があれば、先頭に付けたメッセージ列を返す。
    ///
    /// 2つは1つのシステムメッセージにまとめる(システムメッセージを複数または先頭以外に置くと、
    /// チャットテンプレートによってはエラーになるため)。順序は、ユーザーのプロンプト、書式の説明。
    pub fn with_system_prompt(
        &self,
        messages: &[WireMessage],
        guide: Option<&str>,
    ) -> Vec<WireMessage> {
        let system = [Some(self.system_prompt.as_str()), guide]
            .into_iter()
            .flatten()
            .map(str::trim)
            .filter(|text| !text.is_empty())
            .collect::<Vec<_>>()
            .join("\n\n");
        let mut all = Vec::with_capacity(messages.len() + 1);
        if !system.is_empty() {
            all.push(WireMessage {
                role: Role::System,
                content: system,
            });
        }
        all.extend_from_slice(messages);
        all
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::error::AppErrorKind;

    fn user(text: &str) -> Vec<WireMessage> {
        vec![WireMessage {
            role: Role::User,
            content: text.into(),
        }]
    }

    #[test]
    fn the_defaults_are_valid_and_add_nothing() {
        let settings = GenerationSettings::default();

        assert!(settings.validate().is_ok());
        assert_eq!(settings.params(), GenerationParams::default());
        assert_eq!(settings.with_system_prompt(&user("hi"), None), user("hi"));
    }

    #[test]
    fn a_system_prompt_is_trimmed_and_put_first() {
        let settings = GenerationSettings {
            system_prompt: "  簡潔に答える\n".into(),
            ..Default::default()
        };

        let messages = settings.with_system_prompt(&user("hi"), None);

        assert_eq!(messages.len(), 2);
        assert_eq!(messages[0].role, Role::System);
        assert_eq!(messages[0].content, "簡潔に答える");
        assert_eq!(messages[1], user("hi")[0]);
    }

    #[test]
    fn a_blank_system_prompt_is_not_sent() {
        let settings = GenerationSettings {
            system_prompt: " \n ".into(),
            ..Default::default()
        };

        assert_eq!(settings.with_system_prompt(&user("hi"), None), user("hi"));
    }

    #[test]
    fn the_guide_follows_the_prompt_in_one_system_message() {
        let settings = GenerationSettings {
            system_prompt: "簡潔に答える".into(),
            ..Default::default()
        };

        let messages = settings.with_system_prompt(&user("hi"), Some("\n書式の説明\n"));

        assert_eq!(messages.len(), 2);
        assert_eq!(messages[0].role, Role::System);
        assert_eq!(messages[0].content, "簡潔に答える\n\n書式の説明");
    }

    #[test]
    fn the_guide_alone_is_sent_and_a_blank_guide_is_not() {
        let settings = GenerationSettings::default();

        let with_guide = settings.with_system_prompt(&user("hi"), Some("書式の説明"));
        let blank_guide = settings.with_system_prompt(&user("hi"), Some("  "));

        assert_eq!(with_guide[0].content, "書式の説明");
        assert_eq!(blank_guide, user("hi"));
    }

    #[test]
    fn out_of_range_values_are_rejected() {
        let invalid = |settings: GenerationSettings| {
            assert_eq!(
                settings.validate().unwrap_err().kind,
                AppErrorKind::InvalidInput
            );
        };
        invalid(GenerationSettings {
            temperature: Some(2.5),
            ..Default::default()
        });
        invalid(GenerationSettings {
            temperature: Some(-0.1),
            ..Default::default()
        });
        invalid(GenerationSettings {
            temperature: Some(f32::NAN),
            ..Default::default()
        });
        invalid(GenerationSettings {
            max_tokens: Some(0),
            ..Default::default()
        });
        invalid(GenerationSettings {
            system_prompt: "あ".repeat(MAX_SYSTEM_PROMPT_CHARS + 1),
            ..Default::default()
        });
    }

    #[test]
    fn boundary_values_are_accepted() {
        let settings = GenerationSettings {
            system_prompt: "あ".repeat(MAX_SYSTEM_PROMPT_CHARS),
            temperature: Some(2.0),
            max_tokens: Some(1),
        };

        assert!(settings.validate().is_ok());
        assert!(
            GenerationSettings {
                temperature: Some(0.0),
                ..Default::default()
            }
            .validate()
            .is_ok()
        );
    }
}
