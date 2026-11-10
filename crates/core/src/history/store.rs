//! 履歴のファイルの読み書き。1会話 = 1ファイル(`<id>.json`)。
//!
//! 書き込みは一時ファイル経由のアトミック書き込み。versionの方針:
//! 後方互換の追加ではversionを上げず、読めない変更のときだけ上げる。
//! **新しいversionのファイルは読まず、上書きもしない**。壊れたファイルも上書きしない。

use std::fs;
use std::io::ErrorKind;
use std::path::PathBuf;
use std::sync::Mutex;

use serde::de::DeserializeOwned;
use serde_json::Value;

use super::model::{
    Conversation, ConversationFile, ConversationSummary, HISTORY_VERSION, HistoryListing, MetaFile,
    validate_messages,
};
use super::title::{derive_title, normalize_title};
use crate::error::AppError;
use crate::fs::write_atomic;
use crate::profiles::is_valid_id;

/// 履歴の保存先。読み込みと保存の間に他の書き込みが入らないよう直列化する。
pub struct HistoryStore {
    dir: PathBuf,
    lock: Mutex<()>,
}

/// ファイルを読めなかった理由。
enum ReadError {
    NotFound,
    /// このアプリより新しいversion
    Newer,
    Broken,
    Io(std::io::Error),
}

impl ReadError {
    fn into_app_error(self) -> AppError {
        match self {
            Self::NotFound => AppError::not_found("会話が見つかりません"),
            Self::Newer => AppError::storage(
                "新しいバージョンのアプリで作られた会話のため、読み込めません。アプリを更新してください",
            ),
            Self::Broken => {
                AppError::storage("会話のファイルを解釈できません。ファイルは変更していません")
            }
            Self::Io(e) => AppError::storage(format!("会話のファイルを読み込めませんでした: {e}")),
        }
    }
}

impl HistoryStore {
    /// `dir` は履歴を置くディレクトリ(例: アプリのデータディレクトリの `history`)。
    pub fn new(dir: impl Into<PathBuf>) -> Self {
        Self {
            dir: dir.into(),
            lock: Mutex::new(()),
        }
    }

    /// 履歴の一覧(更新が新しい順)。メッセージは読まない。
    ///
    /// 壊れている、または新しいversionのファイルは一覧に入れず、`skipped` に数える。
    pub fn list(&self) -> Result<HistoryListing, AppError> {
        let _guard = self.guard();
        let entries = match fs::read_dir(&self.dir) {
            Ok(entries) => entries,
            Err(e) if e.kind() == ErrorKind::NotFound => {
                return Ok(HistoryListing {
                    conversations: Vec::new(),
                    skipped: 0,
                });
            }
            Err(e) => {
                return Err(AppError::storage(format!(
                    "履歴を読み込めませんでした: {e}"
                )));
            }
        };

        let mut conversations = Vec::new();
        let mut skipped = 0;
        for entry in entries.flatten() {
            let path = entry.path();
            // 会話のファイルは `<有効なID>.json` だけ。一時ファイルなどは対象外
            let Some(id) = path
                .file_name()
                .and_then(|name| name.to_str())
                .and_then(|name| name.strip_suffix(".json"))
                .filter(|id| is_valid_id(id))
                .map(str::to_owned)
            else {
                continue;
            };
            match read_json::<MetaFile>(&path) {
                Ok(meta) => conversations.push(ConversationSummary {
                    id,
                    title: meta.title,
                    created_at: meta.created_at,
                    updated_at: meta.updated_at,
                }),
                Err(_) => skipped += 1,
            }
        }
        conversations.sort_by(|a, b| {
            b.updated_at
                .cmp(&a.updated_at)
                .then_with(|| a.id.cmp(&b.id))
        });
        Ok(HistoryListing {
            conversations,
            skipped,
        })
    }

    /// 会話1件。
    pub fn load(&self, id: &str) -> Result<Conversation, AppError> {
        let path = self.path_for(id)?;
        let _guard = self.guard();
        let file: ConversationFile = read_json(&path).map_err(ReadError::into_app_error)?;
        Ok(Conversation {
            // ファイル名が正。中のIDは使わない
            id: id.to_owned(),
            title: file.title,
            created_at: file.created_at,
            updated_at: file.updated_at,
            messages: file.messages,
        })
    }

    /// 会話を保存する。`now` はUNIX秒。
    ///
    /// 新しい会話ならタイトルを最初のユーザーメッセージから作る。保存済みなら、タイトルと作成日時は
    /// 変えず、メッセージと更新日時だけを置き換える。メッセージが空なら何も保存せず `None`。
    pub fn save(
        &self,
        id: &str,
        messages: Vec<Value>,
        now: u32,
    ) -> Result<Option<ConversationSummary>, AppError> {
        let path = self.path_for(id)?;
        validate_messages(&messages)?;
        if messages.is_empty() {
            return Ok(None);
        }

        let _guard = self.guard();
        let (title, created_at) = match read_json::<MetaFile>(&path) {
            Ok(meta) => (meta.title, meta.created_at),
            Err(ReadError::NotFound) => (derive_title(&messages), now),
            Err(other) => return Err(other.into_app_error()),
        };
        let file = ConversationFile {
            version: HISTORY_VERSION,
            id: id.to_owned(),
            title,
            created_at,
            updated_at: now.max(created_at),
            messages,
        };
        write_file(&path, &file)?;
        Ok(Some(summary(id, &file)))
    }

    /// 名前を変える。メッセージと更新日時は変えない(一覧の並びが動かないように)。
    pub fn rename(&self, id: &str, title: &str) -> Result<ConversationSummary, AppError> {
        let path = self.path_for(id)?;
        let title = normalize_title(title)?;

        let _guard = self.guard();
        let mut file: ConversationFile = read_json(&path).map_err(ReadError::into_app_error)?;
        file.version = HISTORY_VERSION;
        file.title = title;
        write_file(&path, &file)?;
        Ok(summary(id, &file))
    }

    /// AIが考えたタイトルを付ける。ユーザーが名前を変えていたら上書きせず `None`。
    ///
    /// 「名前を変えていない」とは、タイトルが最初の発言から作った自動のタイトルのままであること。
    /// 生成には時間がかかるので、その間の名前の変更を消さないために、書く直前に確かめる。
    pub fn set_generated_title(
        &self,
        id: &str,
        title: &str,
    ) -> Result<Option<ConversationSummary>, AppError> {
        let path = self.path_for(id)?;
        let title = normalize_title(title)?;

        let _guard = self.guard();
        let mut file: ConversationFile = read_json(&path).map_err(ReadError::into_app_error)?;
        if file.title != derive_title(&file.messages) {
            return Ok(None);
        }
        file.version = HISTORY_VERSION;
        file.title = title;
        write_file(&path, &file)?;
        Ok(Some(summary(id, &file)))
    }

    /// 会話を削除する。すでに無ければ何もしない。
    pub fn delete(&self, id: &str) -> Result<(), AppError> {
        let path = self.path_for(id)?;
        let _guard = self.guard();
        match fs::remove_file(&path) {
            Ok(()) => Ok(()),
            Err(e) if e.kind() == ErrorKind::NotFound => Ok(()),
            Err(e) => Err(AppError::storage(format!(
                "会話を削除できませんでした: {e}"
            ))),
        }
    }

    /// IDからファイルの場所を決める。ファイル名に使えるIDだけを許す(パスの区切りなどを通さない)。
    fn path_for(&self, id: &str) -> Result<PathBuf, AppError> {
        if !is_valid_id(id) {
            return Err(AppError::invalid_input("会話のIDが正しくありません"));
        }
        Ok(self.dir.join(format!("{id}.json")))
    }

    fn guard(&self) -> std::sync::MutexGuard<'_, ()> {
        self.lock
            .lock()
            .unwrap_or_else(std::sync::PoisonError::into_inner)
    }
}

fn summary(id: &str, file: &ConversationFile) -> ConversationSummary {
    ConversationSummary {
        id: id.to_owned(),
        title: file.title.clone(),
        created_at: file.created_at,
        updated_at: file.updated_at,
    }
}

/// ファイルを読み、versionを確かめてから `T` として解釈する。
fn read_json<T: DeserializeOwned>(path: &std::path::Path) -> Result<T, ReadError> {
    #[derive(serde::Deserialize)]
    struct Probe {
        version: u64,
    }

    let text = fs::read_to_string(path).map_err(|e| {
        if e.kind() == ErrorKind::NotFound {
            ReadError::NotFound
        } else {
            ReadError::Io(e)
        }
    })?;
    let probe: Probe = serde_json::from_str(&text).map_err(|_| ReadError::Broken)?;
    if probe.version > u64::from(HISTORY_VERSION) {
        return Err(ReadError::Newer);
    }
    serde_json::from_str(&text).map_err(|_| ReadError::Broken)
}

fn write_file(path: &std::path::Path, file: &ConversationFile) -> Result<(), AppError> {
    let bytes = serde_json::to_vec_pretty(file)
        .map_err(|e| AppError::internal(format!("会話をシリアライズできませんでした: {e}")))?;
    write_atomic(path, &bytes)
        .map_err(|e| AppError::storage(format!("会話を保存できませんでした: {e}")))
}

#[cfg(test)]
mod tests {
    use serde_json::json;

    use super::*;
    use crate::error::AppErrorKind;

    fn user(text: &str) -> Value {
        json!({"id": "m1", "role": "user", "parts": [{"type": "text", "text": text}]})
    }

    fn assistant(text: &str) -> Value {
        json!({"id": "m2", "role": "assistant", "parts": [{"type": "text", "text": text}]})
    }

    fn store(dir: &std::path::Path) -> HistoryStore {
        HistoryStore::new(dir.join("history"))
    }

    fn file(dir: &std::path::Path, id: &str) -> PathBuf {
        dir.join("history").join(format!("{id}.json"))
    }

    #[test]
    fn a_new_conversation_is_saved_with_a_title_and_read_back() {
        let dir = tempfile::tempdir().unwrap();
        let store = store(dir.path());
        let messages = vec![user("こんにちは"), assistant("やあ")];

        let saved = store.save("c1", messages.clone(), 1000).unwrap().unwrap();

        assert_eq!(
            saved,
            ConversationSummary {
                id: "c1".into(),
                title: "こんにちは".into(),
                created_at: 1000,
                updated_at: 1000,
            }
        );
        let loaded = store.load("c1").unwrap();
        assert_eq!(loaded.messages, messages);
        assert_eq!(loaded.title, "こんにちは");
        assert_eq!(store.list().unwrap().conversations, vec![saved]);
    }

    #[test]
    fn the_file_has_only_the_expected_fields_and_a_version() {
        let dir = tempfile::tempdir().unwrap();
        let store = store(dir.path());
        store.save("c1", vec![user("a")], 1).unwrap();

        let text = fs::read_to_string(file(dir.path(), "c1")).unwrap();
        let value: Value = serde_json::from_str(&text).unwrap();

        let mut keys: Vec<_> = value.as_object().unwrap().keys().cloned().collect();
        keys.sort();
        // 秘密情報や実行時の状態を入れる項目はない
        assert_eq!(
            keys,
            [
                "createdAt",
                "id",
                "messages",
                "title",
                "updatedAt",
                "version"
            ]
        );
        assert_eq!(value["version"], 1);
    }

    #[test]
    fn an_empty_conversation_is_not_saved() {
        let dir = tempfile::tempdir().unwrap();
        let store = store(dir.path());

        assert_eq!(store.save("c1", vec![], 1).unwrap(), None);

        assert!(!dir.path().join("history").exists());
    }

    #[test]
    fn saving_again_keeps_the_title_and_creation_time() {
        let dir = tempfile::tempdir().unwrap();
        let store = store(dir.path());
        store.save("c1", vec![user("最初の質問")], 1000).unwrap();
        store.rename("c1", "名前を付けた").unwrap();

        let saved = store
            .save("c1", vec![user("最初の質問"), assistant("答え")], 2000)
            .unwrap()
            .unwrap();

        assert_eq!(saved.title, "名前を付けた");
        assert_eq!(saved.created_at, 1000);
        assert_eq!(saved.updated_at, 2000);
        assert_eq!(store.load("c1").unwrap().messages.len(), 2);
    }

    #[test]
    fn the_update_time_never_goes_before_the_creation_time() {
        let dir = tempfile::tempdir().unwrap();
        let store = store(dir.path());
        store.save("c1", vec![user("a")], 2000).unwrap();

        let saved = store.save("c1", vec![user("a")], 1000).unwrap().unwrap();

        assert_eq!(saved.updated_at, 2000);
    }

    #[test]
    fn rename_changes_only_the_title() {
        let dir = tempfile::tempdir().unwrap();
        let store = store(dir.path());
        let messages = vec![user("a"), assistant("b")];
        store.save("c1", messages.clone(), 1000).unwrap();

        let renamed = store.rename("c1", "  新しい  名前 ").unwrap();

        assert_eq!(renamed.title, "新しい 名前");
        assert_eq!(renamed.updated_at, 1000);
        assert_eq!(store.load("c1").unwrap().messages, messages);
    }

    #[test]
    fn rename_rejects_bad_input_and_unknown_conversations() {
        let dir = tempfile::tempdir().unwrap();
        let store = store(dir.path());
        store.save("c1", vec![user("a")], 1).unwrap();

        assert_eq!(
            store.rename("c1", "  ").unwrap_err().kind,
            AppErrorKind::InvalidInput
        );
        assert_eq!(
            store.rename("missing", "x").unwrap_err().kind,
            AppErrorKind::NotFound
        );
        assert_eq!(store.load("c1").unwrap().title, "a");
    }

    #[test]
    fn a_generated_title_replaces_the_automatic_one_without_touching_the_rest() {
        let dir = tempfile::tempdir().unwrap();
        let store = store(dir.path());
        let messages = vec![user("a"), assistant("b")];
        store.save("c1", messages.clone(), 1000).unwrap();

        let titled = store
            .set_generated_title("c1", " 京都 旅行の計画 ")
            .unwrap()
            .unwrap();

        assert_eq!(titled.title, "京都 旅行の計画");
        assert_eq!(titled.updated_at, 1000);
        assert_eq!(store.load("c1").unwrap().messages, messages);
    }

    #[test]
    fn a_generated_title_never_overwrites_a_name_the_user_chose() {
        let dir = tempfile::tempdir().unwrap();
        let store = store(dir.path());
        store.save("c1", vec![user("a")], 1).unwrap();
        store.rename("c1", "自分で付けた名前").unwrap();

        assert_eq!(store.set_generated_title("c1", "AIの案").unwrap(), None);

        assert_eq!(store.load("c1").unwrap().title, "自分で付けた名前");
    }

    #[test]
    fn a_generated_title_rejects_blank_input_and_unknown_conversations() {
        let dir = tempfile::tempdir().unwrap();
        let store = store(dir.path());
        store.save("c1", vec![user("a")], 1).unwrap();

        assert_eq!(
            store.set_generated_title("c1", " ").unwrap_err().kind,
            AppErrorKind::InvalidInput
        );
        assert_eq!(
            store.set_generated_title("missing", "x").unwrap_err().kind,
            AppErrorKind::NotFound
        );
        assert_eq!(store.load("c1").unwrap().title, "a");
    }

    #[test]
    fn delete_removes_the_file_and_is_idempotent() {
        let dir = tempfile::tempdir().unwrap();
        let store = store(dir.path());
        store.save("c1", vec![user("a")], 1).unwrap();
        store.save("c2", vec![user("b")], 2).unwrap();

        store.delete("c1").unwrap();
        store.delete("c1").unwrap();

        let ids: Vec<_> = store
            .list()
            .unwrap()
            .conversations
            .into_iter()
            .map(|c| c.id)
            .collect();
        assert_eq!(ids, ["c2"]);
        assert_eq!(store.load("c1").unwrap_err().kind, AppErrorKind::NotFound);
    }

    #[test]
    fn ids_that_are_not_file_name_safe_are_rejected_everywhere() {
        let dir = tempfile::tempdir().unwrap();
        let store = store(dir.path());
        for id in ["../x", "a/b", "a b", "", "日本語", &"a".repeat(65)] {
            let kind = AppErrorKind::InvalidInput;
            assert_eq!(store.load(id).unwrap_err().kind, kind, "{id}");
            assert_eq!(store.save(id, vec![user("a")], 1).unwrap_err().kind, kind);
            assert_eq!(store.rename(id, "x").unwrap_err().kind, kind);
            assert_eq!(store.delete(id).unwrap_err().kind, kind);
        }
        assert!(!dir.path().join("x.json").exists());
    }

    #[test]
    fn malformed_messages_are_rejected_without_writing() {
        let dir = tempfile::tempdir().unwrap();
        let store = store(dir.path());

        let error = store
            .save("c1", vec![json!({"role": "user"})], 1)
            .unwrap_err();

        assert_eq!(error.kind, AppErrorKind::InvalidInput);
        assert!(!dir.path().join("history").exists());
    }

    #[test]
    fn the_list_is_newest_first_and_a_missing_directory_is_empty() {
        let dir = tempfile::tempdir().unwrap();
        let store = store(dir.path());
        assert_eq!(store.list().unwrap().conversations, vec![]);

        store.save("old", vec![user("古い")], 1000).unwrap();
        store.save("new", vec![user("新しい")], 3000).unwrap();
        store.save("mid", vec![user("中間")], 2000).unwrap();

        let ids: Vec<_> = store
            .list()
            .unwrap()
            .conversations
            .into_iter()
            .map(|c| c.id)
            .collect();
        assert_eq!(ids, ["new", "mid", "old"]);
    }

    #[test]
    fn broken_and_newer_files_are_skipped_and_left_untouched() {
        let dir = tempfile::tempdir().unwrap();
        let store = store(dir.path());
        store.save("ok", vec![user("a")], 1).unwrap();
        let broken = "{ broken";
        let newer = r#"{"version":2,"title":"x","createdAt":1,"updatedAt":1,"messages":[]}"#;
        fs::write(file(dir.path(), "broken"), broken).unwrap();
        fs::write(file(dir.path(), "newer"), newer).unwrap();
        // 会話のファイルではないものは、数えもしない
        fs::write(dir.path().join("history").join("ok.json.tmp"), "x").unwrap();
        fs::write(dir.path().join("history").join("notes.txt"), "x").unwrap();
        fs::write(dir.path().join("history").join("a b.json"), "x").unwrap();

        let listing = store.list().unwrap();

        assert_eq!(listing.conversations.len(), 1);
        assert_eq!(listing.skipped, 2);
        assert_eq!(
            fs::read_to_string(file(dir.path(), "broken")).unwrap(),
            broken
        );
        assert_eq!(
            fs::read_to_string(file(dir.path(), "newer")).unwrap(),
            newer
        );
    }

    #[test]
    fn a_newer_version_is_refused_and_never_overwritten() {
        let dir = tempfile::tempdir().unwrap();
        let store = store(dir.path());
        let newer = r#"{"version":2,"title":"x","createdAt":1,"updatedAt":1,"messages":[]}"#;
        fs::create_dir_all(dir.path().join("history")).unwrap();
        fs::write(file(dir.path(), "c1"), newer).unwrap();

        let load = store.load("c1").unwrap_err();
        assert!(load.message.contains("新しいバージョン"), "{load}");
        assert!(store.save("c1", vec![user("a")], 5).is_err());
        assert!(store.rename("c1", "x").is_err());

        assert_eq!(fs::read_to_string(file(dir.path(), "c1")).unwrap(), newer);
    }

    #[test]
    fn a_broken_file_is_refused_and_never_overwritten() {
        let dir = tempfile::tempdir().unwrap();
        let store = store(dir.path());
        fs::create_dir_all(dir.path().join("history")).unwrap();
        fs::write(file(dir.path(), "c1"), "{ broken").unwrap();

        assert_eq!(store.load("c1").unwrap_err().kind, AppErrorKind::Storage);
        assert!(store.save("c1", vec![user("a")], 5).is_err());
        assert!(store.rename("c1", "x").is_err());

        assert_eq!(
            fs::read_to_string(file(dir.path(), "c1")).unwrap(),
            "{ broken"
        );
    }

    #[test]
    fn the_file_name_wins_over_the_id_inside_the_file() {
        let dir = tempfile::tempdir().unwrap();
        let store = store(dir.path());
        fs::create_dir_all(dir.path().join("history")).unwrap();
        fs::write(
            file(dir.path(), "c1"),
            r#"{"version":1,"id":"other","title":"t","createdAt":1,"updatedAt":2,"messages":[]}"#,
        )
        .unwrap();

        assert_eq!(store.load("c1").unwrap().id, "c1");
        assert_eq!(store.list().unwrap().conversations[0].id, "c1");
    }

    #[test]
    fn unknown_extra_fields_in_the_current_version_are_tolerated() {
        let dir = tempfile::tempdir().unwrap();
        let store = store(dir.path());
        fs::create_dir_all(dir.path().join("history")).unwrap();
        fs::write(
            file(dir.path(), "c1"),
            r#"{"version":1,"id":"c1","future":1,"title":"t","createdAt":1,"updatedAt":2,"messages":[]}"#,
        )
        .unwrap();

        assert_eq!(store.load("c1").unwrap().title, "t");
        assert_eq!(store.list().unwrap().conversations.len(), 1);
    }

    #[test]
    fn a_failed_write_keeps_the_previous_version() {
        let dir = tempfile::tempdir().unwrap();
        let store = store(dir.path());
        store.save("c1", vec![user("元")], 1).unwrap();
        // 一時ファイルの場所を塞いで、書き込みを失敗させる
        fs::create_dir(dir.path().join("history").join("c1.json.tmp")).unwrap();

        assert!(store.save("c1", vec![user("新")], 2).is_err());

        assert_eq!(store.load("c1").unwrap().messages, vec![user("元")]);
    }
}
