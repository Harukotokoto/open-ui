//! プロファイルの一覧と、使用中のプロファイル。

use serde::{Deserialize, Serialize};
use specta::Type;

use super::model::ConnectionProfile;
use crate::error::AppError;

/// 保存されたプロファイルの一覧。常に1件以上あり、`active_id` はその中のどれかを指す。
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

    /// 末尾に追加する。IDが既にあるときは失敗する。入力は検査済みであること。
    pub fn add(&mut self, profile: ConnectionProfile) -> Result<(), AppError> {
        if self.find(&profile.id).is_some() {
            return Err(AppError::invalid_input("同じIDの接続先が既にあります"));
        }
        self.profiles.push(profile);
        Ok(())
    }

    /// 削除する。最後の1件は削除できない。使用中のものを消したら、先頭のものを使用中にする。
    pub fn remove(&mut self, id: &str) -> Result<(), AppError> {
        let index = self
            .profiles
            .iter()
            .position(|p| p.id == id)
            .ok_or_else(|| AppError::not_found("接続先が見つかりません"))?;
        if self.profiles.len() == 1 {
            return Err(AppError::invalid_input("最後の接続先は削除できません"));
        }
        self.profiles.remove(index);
        if self.active_id == id {
            self.active_id = self.profiles[0].id.clone();
        }
        Ok(())
    }

    /// 使用中のプロファイルを切り替える。
    pub fn set_active(&mut self, id: &str) -> Result<(), AppError> {
        if self.find(id).is_none() {
            return Err(AppError::not_found("接続先が見つかりません"));
        }
        self.active_id = id.to_owned();
        Ok(())
    }

    /// プロファイルの選択モデルを変え、そのプロファイルを使用中にする
    /// (別のプロファイルのモデルを選ぶと、使用中の接続先も切り替わる)。
    /// `model` が `None` か空白だけなら、サーバーの既定に任せる。
    pub fn select_model(&mut self, id: &str, model: Option<&str>) -> Result<(), AppError> {
        let profile = self
            .profiles
            .iter_mut()
            .find(|p| p.id == id)
            .ok_or_else(|| AppError::not_found("接続先が見つかりません"))?;
        profile.selected_model = model
            .map(str::trim)
            .filter(|m| !m.is_empty())
            .map(str::to_owned);
        self.active_id = id.to_owned();
        Ok(())
    }

    /// 名前が既存のものと重ならないようにする(重なるときは「 2」「 3」…を付ける)。
    pub fn unique_name(&self, base: &str) -> String {
        let taken = |name: &str| self.profiles.iter().any(|p| p.name == name);
        if !taken(base) {
            return base.to_owned();
        }
        (2..)
            .map(|n| format!("{base} {n}"))
            .find(|name| !taken(name))
            .expect("いつかは空きが見つかる")
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

    fn book_of(ids: &[&str], active: &str) -> ProfileBook {
        ProfileBook {
            profiles: ids.iter().map(|id| profile(id)).collect(),
            active_id: active.into(),
        }
    }

    #[test]
    fn add_appends_and_rejects_a_duplicate_id() {
        let mut book = book_of(&["a"], "a");

        book.add(profile("b")).unwrap();

        assert_eq!(book.profiles.len(), 2);
        assert_eq!(book.profiles[1].id, "b");
        assert_eq!(book.active_id, "a");
        assert_eq!(
            book.add(profile("b")).unwrap_err().kind,
            AppErrorKind::InvalidInput
        );
        assert_eq!(book.profiles.len(), 2);
    }

    #[test]
    fn removing_an_inactive_profile_keeps_the_active_one() {
        let mut book = book_of(&["a", "b", "c"], "c");

        book.remove("b").unwrap();

        assert_eq!(book.profiles.len(), 2);
        assert_eq!(book.active_id, "c");
    }

    #[test]
    fn removing_the_active_profile_activates_the_first_one() {
        let mut book = book_of(&["a", "b", "c"], "c");

        book.remove("c").unwrap();

        assert_eq!(book.active_id, "a");
        assert!(book.active().is_some());
    }

    #[test]
    fn the_last_profile_and_unknown_ids_cannot_be_removed() {
        let mut book = book_of(&["a"], "a");
        assert_eq!(
            book.remove("a").unwrap_err().kind,
            AppErrorKind::InvalidInput
        );
        assert_eq!(book.profiles.len(), 1);

        let mut book = book_of(&["a", "b"], "a");
        assert_eq!(book.remove("x").unwrap_err().kind, AppErrorKind::NotFound);
    }

    #[test]
    fn set_active_requires_an_existing_profile() {
        let mut book = book_of(&["a", "b"], "a");

        book.set_active("b").unwrap();
        assert_eq!(book.active_id, "b");

        assert_eq!(
            book.set_active("x").unwrap_err().kind,
            AppErrorKind::NotFound
        );
        assert_eq!(book.active_id, "b");
    }

    #[test]
    fn selecting_a_model_also_activates_its_profile() {
        let mut book = book_of(&["a", "b"], "a");

        book.select_model("b", Some(" qwen3 ")).unwrap();

        assert_eq!(book.active_id, "b");
        assert_eq!(
            book.find("b").unwrap().selected_model.as_deref(),
            Some("qwen3")
        );
        assert_eq!(book.find("a").unwrap().selected_model, None);
    }

    #[test]
    fn selecting_no_model_clears_it_and_unknown_profiles_change_nothing() {
        let mut book = book_of(&["a", "b"], "a");
        book.select_model("a", Some("m")).unwrap();

        book.select_model("a", None).unwrap();
        assert_eq!(book.find("a").unwrap().selected_model, None);

        book.select_model("a", Some("  ")).unwrap();
        assert_eq!(book.find("a").unwrap().selected_model, None);

        assert_eq!(
            book.select_model("x", Some("m")).unwrap_err().kind,
            AppErrorKind::NotFound
        );
        assert_eq!(book.active_id, "a");
    }

    #[test]
    fn names_are_made_unique_with_a_number() {
        let mut book = book_of(&["a"], "a");
        book.profiles[0].name = "Ollama".into();
        assert_eq!(book.unique_name("vLLM"), "vLLM");
        assert_eq!(book.unique_name("Ollama"), "Ollama 2");

        book.add(ConnectionProfile {
            name: "Ollama 2".into(),
            ..profile("b")
        })
        .unwrap();
        assert_eq!(book.unique_name("Ollama"), "Ollama 3");
    }
}
