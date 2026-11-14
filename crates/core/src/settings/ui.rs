//! 画面の状態のうち、次回の起動に引き継ぐもの。

use serde::{Deserialize, Serialize};
use specta::Type;

/// テーマの選択。`system` はOSの設定に従う。
#[derive(Debug, Clone, Copy, Default, PartialEq, Eq, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub enum Theme {
    #[default]
    System,
    Light,
    Dark,
}

/// 入力欄でShift+Enterを押したときの動き。
///
/// `newline` は「Enterで送信・Shift+Enterで改行」、
/// `send` は「Shift+Enterで送信・Enterで改行」。
#[derive(Debug, Clone, Copy, Default, PartialEq, Eq, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub enum ShiftEnterBehavior {
    #[default]
    Newline,
    Send,
}

/// ボタンや選択中の項目に使う強調色。macOSのアクセントカラーと同じ選択肢。
#[derive(Debug, Clone, Copy, Default, PartialEq, Eq, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub enum AccentColor {
    #[default]
    Blue,
    Purple,
    Pink,
    Red,
    Orange,
    Yellow,
    Green,
    Graphite,
}

/// 画面の設定。項目を足すときは `#[serde(default)]` で埋まるようにする(versionは上げない)。
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase", default)]
pub struct UiSettings {
    /// サイドバーを開いているか
    pub sidebar_open: bool,
    /// テーマの選択
    pub theme: Theme,
    /// 入力欄でShift+Enterを押したときの動き
    pub shift_enter: ShiftEnterBehavior,
    /// アクセントカラー
    pub accent: AccentColor,
}

impl Default for UiSettings {
    fn default() -> Self {
        Self {
            sidebar_open: true,
            theme: Theme::default(),
            shift_enter: ShiftEnterBehavior::default(),
            accent: AccentColor::default(),
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn a_missing_theme_falls_back_to_the_system_theme() {
        let ui: UiSettings = serde_json::from_str(r#"{"sidebarOpen":false}"#).unwrap();

        assert!(!ui.sidebar_open);
        assert_eq!(ui.theme, Theme::System);
    }

    #[test]
    fn a_missing_shift_enter_falls_back_to_newline() {
        let ui: UiSettings = serde_json::from_str(r#"{"theme":"dark"}"#).unwrap();

        assert_eq!(ui.shift_enter, ShiftEnterBehavior::Newline);
    }

    #[test]
    fn shift_enter_is_camel_case_in_json() {
        let ui: UiSettings = serde_json::from_str(r#"{"shiftEnter":"send"}"#).unwrap();

        assert_eq!(ui.shift_enter, ShiftEnterBehavior::Send);
        assert_eq!(
            serde_json::to_string(&ShiftEnterBehavior::Newline).unwrap(),
            r#""newline""#
        );
    }

    #[test]
    fn a_missing_accent_falls_back_to_blue() {
        let ui: UiSettings = serde_json::from_str(r#"{"theme":"dark"}"#).unwrap();

        assert_eq!(ui.accent, AccentColor::Blue);
    }

    #[test]
    fn accents_are_lowercase_in_json() {
        let ui: UiSettings = serde_json::from_str(r#"{"accent":"graphite"}"#).unwrap();

        assert_eq!(ui.accent, AccentColor::Graphite);
        assert_eq!(
            serde_json::to_string(&AccentColor::Purple).unwrap(),
            r#""purple""#
        );
    }

    #[test]
    fn themes_are_lowercase_in_json() {
        assert_eq!(serde_json::to_string(&Theme::Dark).unwrap(), r#""dark""#);
        let ui: UiSettings = serde_json::from_str(r#"{"theme":"light"}"#).unwrap();
        assert_eq!(ui.theme, Theme::Light);
    }
}
