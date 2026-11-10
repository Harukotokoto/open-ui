//! 画面の状態のうち、次回の起動に引き継ぐもの。

use serde::{Deserialize, Serialize};
use specta::Type;

/// 画面の設定。項目を足すときは `#[serde(default)]` で埋まるようにする(versionは上げない)。
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase", default)]
pub struct UiSettings {
    /// サイドバーを開いているか
    pub sidebar_open: bool,
}

impl Default for UiSettings {
    fn default() -> Self {
        Self { sidebar_open: true }
    }
}
