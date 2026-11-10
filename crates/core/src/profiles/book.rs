//! プロファイルの一覧と、使用中のプロファイル。

use serde::{Deserialize, Serialize};
use specta::Type;

use super::model::ConnectionProfile;
use crate::error::AppError;

/// 保存されたプロファイルの一覧。常に1件以上あり、`active_id` はその中のどれかを指す。
///
/// ①ではプロファイルが1件だけ。複数の管理は③で足す。
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct ProfileBook {
    pub profiles: Vec<ConnectionProfile>,
    /// 使用中のプロファイルのID
    pub active_id: String,
}

impl Default for ProfileBook {
    fn default() -> Self {
        let profile = ConnectionProfile::lm_studio();
        Self {
            active_id: profile.id.clone(),
            profiles: vec![profile],
        }
    }
}

impl ProfileBook {
    pub fn find(&self, id: &str) -> Option<&ConnectionProfile> {
        self.profiles.iter().find(|p| p.id == id)
    }

    /// 使用中のプロファイル。
    pub fn active(&self) -> Option<&ConnectionProfile> {
        self.find(&self.active_id)
    }

    /// 読み込んだ内容を整える。空ならLM Studioの1件に、使用中のIDが無効なら先頭にする。
    pub fn normalized(mut self) -> Self {
        if self.profiles.is_empty() {
            return Self::default();
        }
        if self.active().is_none() {
            self.active_id = self.profiles[0].id.clone();
        }
        self
    }

    /// 既存のプロファイルを入力で置き換える。入力は検査済みであること。
    pub fn replace(&mut self, profile: ConnectionProfile) -> Result<(), AppError> {
        match self.profiles.iter_mut().find(|p| p.id == profile.id) {
            Some(slot) => {
                *slot = profile;
                Ok(())
            }
            None => Err(AppError::not_found("接続先が見つかりません")),
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::error::AppErrorKind;

    fn profile(id: &str) -> ConnectionProfile {
        ConnectionProfile {
            id: id.into(),
            ..ConnectionProfile::lm_studio()
        }
    }

    #[test]
    fn the_default_book_has_one_active_profile() {
        let book = ProfileBook::default();
        assert_eq!(book.profiles.len(), 1);
        assert_eq!(book.active().unwrap().name, "LM Studio");
    }

    #[test]
    fn an_empty_book_is_replaced_by_the_default() {
        let book = ProfileBook {
            profiles: vec![],
            active_id: "x".into(),
        };
        assert_eq!(book.normalized(), ProfileBook::default());
    }

    #[test]
    fn an_unknown_active_id_falls_back_to_the_first_profile() {
        let book = ProfileBook {
            profiles: vec![profile("a"), profile("b")],
            active_id: "gone".into(),
        };
        assert_eq!(book.normalized().active_id, "a");
    }

    #[test]
    fn replace_updates_the_matching_profile_only() {
        let mut book = ProfileBook {
            profiles: vec![profile("a"), profile("b")],
            active_id: "a".into(),
        };
        let changed = ConnectionProfile {
            name: "変更".into(),
            ..profile("b")
        };

        book.replace(changed).unwrap();

        assert_eq!(book.find("b").unwrap().name, "変更");
        assert_eq!(book.find("a").unwrap().name, "LM Studio");
    }

    #[test]
    fn replacing_an_unknown_profile_is_not_found() {
        let mut book = ProfileBook::default();
        let error = book.replace(profile("nope")).unwrap_err();
        assert_eq!(error.kind, AppErrorKind::NotFound);
    }
}
