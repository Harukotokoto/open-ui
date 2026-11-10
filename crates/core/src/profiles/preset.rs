//! プロファイルを追加するときの雛形(LM Studio・Ollama など)。

use serde::{Deserialize, Serialize};
use specta::Type;

use super::model::ConnectionProfile;
use crate::api::ProviderKind;

/// 追加するプロファイルの種類。名前とURLの初期値だけが違い、追加後は自由に編集できる。
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub enum ProfilePreset {
    LmStudio,
    Ollama,
    LlamaCpp,
    Vllm,
    /// 上のどれでもないOpenAI互換サーバー。URLは書き換える前提の仮の値
    Custom,
}

impl ProfilePreset {
    /// 一覧に出す名前(プロファイルの初期の名前にもなる)。
    pub fn label(self) -> &'static str {
        match self {
            Self::LmStudio => "LM Studio",
            Self::Ollama => "Ollama",
            Self::LlamaCpp => "llama.cpp",
            Self::Vllm => "vLLM",
            Self::Custom => "カスタム",
        }
    }

    /// 各サーバーの既定のポートで待ち受けるときのベースURL。
    pub fn base_url(self) -> &'static str {
        match self {
            Self::LmStudio => "http://localhost:1234/v1",
            Self::Ollama => "http://localhost:11434/v1",
            Self::LlamaCpp | Self::Custom => "http://localhost:8080/v1",
            Self::Vllm => "http://localhost:8000/v1",
        }
    }

    /// この種類の新しいプロファイル。`id` と `name` は呼び出し側が重ならないように決める。
    pub fn profile(self, id: String, name: String) -> ConnectionProfile {
        ConnectionProfile {
            id,
            name,
            kind: ProviderKind::OpenAiCompatible,
            base_url: self.base_url().to_owned(),
            selected_model: None,
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::profiles::validate_base_url;

    const ALL: [ProfilePreset; 5] = [
        ProfilePreset::LmStudio,
        ProfilePreset::Ollama,
        ProfilePreset::LlamaCpp,
        ProfilePreset::Vllm,
        ProfilePreset::Custom,
    ];

    #[test]
    fn every_preset_has_a_valid_url_that_survives_normalization() {
        for preset in ALL {
            assert_eq!(
                validate_base_url(preset.base_url()).unwrap(),
                preset.base_url(),
                "{preset:?}"
            );
        }
    }

    #[test]
    fn the_four_servers_use_their_default_ports() {
        assert!(ProfilePreset::LmStudio.base_url().contains(":1234/"));
        assert!(ProfilePreset::Ollama.base_url().contains(":11434/"));
        assert!(ProfilePreset::LlamaCpp.base_url().contains(":8080/"));
        assert!(ProfilePreset::Vllm.base_url().contains(":8000/"));
    }

    #[test]
    fn the_profile_starts_from_the_preset() {
        let profile = ProfilePreset::Ollama.profile("p1".into(), "Ollama 2".into());

        assert_eq!(profile.id, "p1");
        assert_eq!(profile.name, "Ollama 2");
        assert_eq!(profile.base_url, "http://localhost:11434/v1");
        assert_eq!(profile.selected_model, None);
        assert!(profile.validated().is_ok());
    }
}
