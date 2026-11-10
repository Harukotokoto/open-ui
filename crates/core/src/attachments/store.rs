//! 添付ファイルの保存。`<履歴のディレクトリ>/<会話ID>/attachments/` に、1件につき3つまでのファイルを置く。
//!
//! - `<id>.bin`: 中身(画像は縮小後)
//! - `<id>.txt`: PDFから取り出したテキスト(PDFだけ)
//! - `<id>.json`: [`AttachmentInfo`]。**最後に書く**(これがあれば、保存が完了している)
//!
//! 会話のJSONには、このIDへの参照(`attachment://<id>`)だけを持たせ、中身は入れない。

use std::collections::HashSet;
use std::fs;
use std::io::{ErrorKind, Read};
use std::path::{Path, PathBuf};
use std::time::SystemTime;

use base64::Engine;
use base64::engine::general_purpose::STANDARD;
use serde_json::Value;

use super::model::{AttachmentImage, AttachmentInfo, AttachmentKind, MAX_FILE_BYTES, ORPHAN_GRACE};
use super::sniff::{self, Prepared};
use crate::error::AppError;
use crate::fs::write_atomic;
use crate::profiles::is_valid_id;

/// 会話のJSONの中で、添付のファイルパーツ(`FileUIPart`)の `url` が持つ接頭辞。
pub const URL_PREFIX: &str = "attachment://";

/// 表示名の最大文字数。
const MAX_FILENAME_CHARS: usize = 200;
/// 名前が空になったときの表示名。
const FALLBACK_FILENAME: &str = "file";
const ATTACHMENTS_DIR: &str = "attachments";

/// 保存した添付1件。
pub(super) struct Stored {
    pub info: AttachmentInfo,
    pub bytes: Vec<u8>,
    /// PDFのテキスト
    pub text: Option<String>,
}

pub struct AttachmentStore {
    history_dir: PathBuf,
}

impl AttachmentStore {
    /// `history_dir` は履歴を置くディレクトリ(会話のJSONと同じ場所)。
    pub fn new(history_dir: impl Into<PathBuf>) -> Self {
        Self {
            history_dir: history_dir.into(),
        }
    }

    /// 中身を検査して、保存する。種類は中身から決め、画像は必要なら縮小し、PDFはテキストを取り出す。
    pub fn add(
        &self,
        conversation_id: &str,
        filename: &str,
        bytes: Vec<u8>,
    ) -> Result<AttachmentInfo, AppError> {
        let dir = self.dir_for(conversation_id)?;
        if bytes.len() > MAX_FILE_BYTES {
            return Err(too_large());
        }
        let Prepared {
            kind,
            media_type,
            bytes,
            extracted_text,
        } = sniff::prepare(bytes)?;

        let info = AttachmentInfo {
            id: uuid::Uuid::new_v4().to_string(),
            filename: clean_filename(filename),
            media_type,
            kind,
            size: u32::try_from(bytes.len())
                .map_err(|_| AppError::invalid_input("ファイルが大きすぎます"))?,
        };
        let written = write_all(&dir, &info, &bytes, extracted_text.as_deref());
        if let Err(error) = written {
            remove_files(&dir, &info.id);
            return Err(error);
        }
        Ok(info)
    }

    /// base64で受け取った中身を保存する(画面のドロップ・ファイル選択から)。
    /// 上限を超えるものは、デコードする前に断る。
    pub fn add_base64(
        &self,
        conversation_id: &str,
        filename: &str,
        data: &str,
    ) -> Result<AttachmentInfo, AppError> {
        // base64は元の4/3倍。余白を少し見て、明らかに大きいものだけを先に断る
        if data.len() > MAX_FILE_BYTES / 3 * 4 + 16 {
            return Err(too_large());
        }
        let bytes = STANDARD
            .decode(data.trim())
            .map_err(|_| AppError::invalid_input("ファイルの内容を読み取れませんでした"))?;
        self.add(conversation_id, filename, bytes)
    }

    /// パスのファイルを読んで保存する(ネイティブのダイアログから)。
    /// 大きなファイルは、読み込む前にサイズを見て断る。
    pub fn add_path(&self, conversation_id: &str, path: &Path) -> Result<AttachmentInfo, AppError> {
        let failed =
            |e: std::io::Error| AppError::storage(format!("ファイルを読み込めませんでした: {e}"));
        let metadata = fs::metadata(path).map_err(failed)?;
        if !metadata.is_file() {
            return Err(AppError::invalid_input("ファイルではありません"));
        }
        if metadata.len() > MAX_FILE_BYTES as u64 {
            return Err(too_large());
        }
        let file = fs::File::open(path).map_err(failed)?;
        // 読む途中で大きくなっても、上限を超えては読まない
        let mut bytes = Vec::new();
        file.take(MAX_FILE_BYTES as u64 + 1)
            .read_to_end(&mut bytes)
            .map_err(failed)?;
        let name = path
            .file_name()
            .and_then(|name| name.to_str())
            .unwrap_or_default();
        self.add(conversation_id, name, bytes)
    }

    /// 画像の中身(サムネイルの表示用)。画像以外はエラー。
    pub fn image(&self, conversation_id: &str, id: &str) -> Result<AttachmentImage, AppError> {
        let stored = self.read(conversation_id, id)?;
        if stored.info.kind != AttachmentKind::Image {
            return Err(AppError::invalid_input("画像ではありません"));
        }
        Ok(AttachmentImage {
            media_type: stored.info.media_type,
            data: STANDARD.encode(stored.bytes),
        })
    }

    /// 添付1件を消す。すでに無ければ何もしない。
    pub fn remove(&self, conversation_id: &str, id: &str) -> Result<(), AppError> {
        let dir = self.dir_for(conversation_id)?;
        check_id(id)?;
        remove_files(&dir, id);
        Ok(())
    }

    /// 会話の添付をすべて消す(会話を削除するとき)。
    pub fn delete_conversation(&self, conversation_id: &str) -> Result<(), AppError> {
        let dir = self.dir_for(conversation_id)?;
        remove_attachments_dir(&dir)
    }

    /// 会話のメッセージから参照されていない、古い添付を消す(送信されなかった添付の掃除)。
    ///
    /// 作ってから [`ORPHAN_GRACE`] 経っていないものは、入力欄で選んだばかりかもしれないので残す。
    pub fn prune_unreferenced(
        &self,
        conversation_id: &str,
        messages: &[Value],
        now: SystemTime,
    ) -> Result<(), AppError> {
        let dir = self.dir_for(conversation_id)?;
        let referenced = referenced_ids(messages);
        let Ok(entries) = fs::read_dir(&dir) else {
            return Ok(());
        };
        for entry in entries.flatten() {
            let path = entry.path();
            let Some(id) = id_of(&path) else { continue };
            if referenced.contains(&id) || !is_older_than_grace(&path, now) {
                continue;
            }
            // 一時ファイル(`.tmp`)や知らないファイルは、id_of が None を返すので触らない
            let _ = fs::remove_file(&path);
        }
        Ok(())
    }

    /// 会話のファイルが無いまま残った添付(保存前にアプリが終わった会話など)を消す。
    /// 最後の更新から [`ORPHAN_GRACE`] 経っていないものは残す。消した会話の数を返す。
    pub fn prune_orphans(&self, now: SystemTime) -> Result<usize, AppError> {
        let Ok(entries) = fs::read_dir(&self.history_dir) else {
            return Ok(0);
        };
        let mut pruned = 0;
        for entry in entries.flatten() {
            let path = entry.path();
            let Some(id) = path
                .file_name()
                .and_then(|name| name.to_str())
                .filter(|name| is_valid_id(name))
                .map(str::to_owned)
            else {
                continue;
            };
            let attachments = path.join(ATTACHMENTS_DIR);
            if !attachments.is_dir() || self.history_dir.join(format!("{id}.json")).exists() {
                continue;
            }
            if !newest_in(&attachments).is_none_or(|time| is_older(time, now)) {
                continue;
            }
            if remove_attachments_dir(&path.join(ATTACHMENTS_DIR)).is_ok() {
                // 空になった会話のディレクトリも消す(空でなければ失敗するだけ)
                let _ = fs::remove_dir(&path);
                pruned += 1;
            }
        }
        Ok(pruned)
    }

    /// 保存済みの添付を読む。
    pub(super) fn read(&self, conversation_id: &str, id: &str) -> Result<Stored, AppError> {
        let dir = self.dir_for(conversation_id)?;
        check_id(id)?;
        let info: AttachmentInfo = read_file(&dir.join(format!("{id}.json")))
            .and_then(|bytes| {
                serde_json::from_slice(&bytes).map_err(|_| AppError::storage(damaged()))
            })
            .map_err(|e| not_found_or(e, "添付ファイルが見つかりません"))?;
        let bytes = read_file(&dir.join(format!("{id}.bin")))
            .map_err(|e| not_found_or(e, "添付ファイルが見つかりません"))?;
        let text = match info.kind {
            AttachmentKind::Pdf => {
                let raw = read_file(&dir.join(format!("{id}.txt")))
                    .map_err(|e| not_found_or(e, "添付ファイルが見つかりません"))?;
                Some(String::from_utf8_lossy(&raw).into_owned())
            }
            AttachmentKind::Text => Some(sniff::decode_text(&bytes)),
            AttachmentKind::Image => None,
        };
        Ok(Stored {
            // ファイル名が正。中のIDは使わない
            info: AttachmentInfo {
                id: id.to_owned(),
                ..info
            },
            bytes,
            text,
        })
    }

    fn dir_for(&self, conversation_id: &str) -> Result<PathBuf, AppError> {
        if !is_valid_id(conversation_id) {
            return Err(AppError::invalid_input("会話のIDが正しくありません"));
        }
        Ok(self.history_dir.join(conversation_id).join(ATTACHMENTS_DIR))
    }
}

/// 会話のメッセージ(`UIMessage` のJSON)が参照している添付のID。
pub fn referenced_ids(messages: &[Value]) -> HashSet<String> {
    messages
        .iter()
        .filter_map(|message| message["parts"].as_array())
        .flatten()
        .filter(|part| part["type"] == "file")
        .filter_map(|part| part["url"].as_str())
        .filter_map(|url| url.strip_prefix(URL_PREFIX))
        .map(str::to_owned)
        .collect()
}

fn too_large() -> AppError {
    AppError::invalid_input(format!(
        "ファイルが大きすぎます(上限は{}MBです)",
        MAX_FILE_BYTES / 1024 / 1024
    ))
}

fn check_id(id: &str) -> Result<(), AppError> {
    if is_valid_id(id) {
        Ok(())
    } else {
        Err(AppError::invalid_input(
            "添付ファイルのIDが正しくありません",
        ))
    }
}

/// 表示名を整える。パスの区切りより後ろだけを使い、制御文字を除いて、長ければ切る。
fn clean_filename(name: &str) -> String {
    let base = name.rsplit(['/', '\\']).next().unwrap_or_default();
    let cleaned: String = base.chars().filter(|c| !c.is_control()).collect();
    let cleaned = cleaned.trim();
    if cleaned.is_empty() {
        return FALLBACK_FILENAME.to_owned();
    }
    cleaned.chars().take(MAX_FILENAME_CHARS).collect()
}

fn write_all(
    dir: &Path,
    info: &AttachmentInfo,
    bytes: &[u8],
    text: Option<&str>,
) -> Result<(), AppError> {
    let failed =
        |e: std::io::Error| AppError::storage(format!("添付ファイルを保存できませんでした: {e}"));
    write_atomic(&dir.join(format!("{}.bin", info.id)), bytes).map_err(failed)?;
    if let Some(text) = text {
        write_atomic(&dir.join(format!("{}.txt", info.id)), text.as_bytes()).map_err(failed)?;
    }
    let meta = serde_json::to_vec(info)
        .map_err(|e| AppError::internal(format!("添付の情報を書き出せませんでした: {e}")))?;
    write_atomic(&dir.join(format!("{}.json", info.id)), &meta).map_err(failed)
}

fn remove_files(dir: &Path, id: &str) {
    for ext in ["json", "bin", "txt"] {
        let _ = fs::remove_file(dir.join(format!("{id}.{ext}")));
    }
}

/// `attachments` ディレクトリごと消す。無ければ何もしない。
fn remove_attachments_dir(dir: &Path) -> Result<(), AppError> {
    match fs::remove_dir_all(dir) {
        Ok(()) => {}
        Err(e) if e.kind() == ErrorKind::NotFound => return Ok(()),
        Err(e) => {
            return Err(AppError::storage(format!(
                "添付ファイルを削除できませんでした: {e}"
            )));
        }
    }
    // 会話のディレクトリが空になっていたら消す(空でなければ失敗するだけ)
    if let Some(parent) = dir.parent() {
        let _ = fs::remove_dir(parent);
    }
    Ok(())
}

fn read_file(path: &Path) -> Result<Vec<u8>, AppError> {
    fs::read(path).map_err(|e| {
        if e.kind() == ErrorKind::NotFound {
            AppError::not_found("添付ファイルが見つかりません")
        } else {
            AppError::storage(format!("添付ファイルを読み込めませんでした: {e}"))
        }
    })
}

fn damaged() -> &'static str {
    "添付ファイルの情報を読み込めませんでした"
}

fn not_found_or(error: AppError, message: &str) -> AppError {
    if error.kind == crate::error::AppErrorKind::NotFound {
        AppError::not_found(message)
    } else {
        error
    }
}

/// `<id>.bin` / `.json` / `.txt` のファイルからIDを取り出す。それ以外(一時ファイルなど)は `None`。
fn id_of(path: &Path) -> Option<String> {
    let name = path.file_name()?.to_str()?;
    let (id, ext) = name.rsplit_once('.')?;
    (matches!(ext, "bin" | "json" | "txt") && is_valid_id(id)).then(|| id.to_owned())
}

fn modified(path: &Path) -> Option<SystemTime> {
    fs::metadata(path).and_then(|m| m.modified()).ok()
}

fn is_older(time: SystemTime, now: SystemTime) -> bool {
    now.duration_since(time)
        .is_ok_and(|elapsed| elapsed >= ORPHAN_GRACE)
}

fn is_older_than_grace(path: &Path, now: SystemTime) -> bool {
    modified(path).is_some_and(|time| is_older(time, now))
}

/// ディレクトリ内でいちばん新しい更新時刻。中身が無ければディレクトリ自身の時刻。
fn newest_in(dir: &Path) -> Option<SystemTime> {
    let newest = fs::read_dir(dir)
        .ok()?
        .flatten()
        .filter_map(|entry| modified(&entry.path()))
        .max();
    newest.or_else(|| modified(dir))
}

#[cfg(test)]
mod tests {
    use std::time::Duration;

    use serde_json::json;

    use super::*;
    use crate::error::AppErrorKind;

    /// 1×1のPNG。
    const PNG: &[u8] = &[
        0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0x00, 0x00, 0x00, 0x0D, 0x49, 0x48, 0x44,
        0x52, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01, 0x08, 0x06, 0x00, 0x00, 0x00, 0x1F,
        0x15, 0xC4, 0x89, 0x00, 0x00, 0x00, 0x0D, 0x49, 0x44, 0x41, 0x54, 0x78, 0x9C, 0x63, 0xF8,
        0xFF, 0xFF, 0x3F, 0x00, 0x05, 0xFE, 0x02, 0xFE, 0xDC, 0xCC, 0x59, 0xE7, 0x00, 0x00, 0x00,
        0x00, 0x49, 0x45, 0x4E, 0x44, 0xAE, 0x42, 0x60, 0x82,
    ];

    fn store(dir: &Path) -> AttachmentStore {
        AttachmentStore::new(dir.join("history"))
    }

    fn attachments_dir(dir: &Path, conversation: &str) -> PathBuf {
        dir.join("history").join(conversation).join("attachments")
    }

    fn set_age(path: &Path, age: Duration) {
        let file = fs::OpenOptions::new().write(true).open(path).unwrap();
        file.set_modified(SystemTime::now() - age).unwrap();
    }

    fn day() -> Duration {
        ORPHAN_GRACE + Duration::from_secs(60)
    }

    #[test]
    fn a_text_file_is_saved_and_read_back() {
        let dir = tempfile::tempdir().unwrap();
        let store = store(dir.path());

        let info = store
            .add("c1", "main.rs", b"fn main() {}".to_vec())
            .unwrap();

        assert_eq!(info.filename, "main.rs");
        assert_eq!(info.kind, AttachmentKind::Text);
        assert_eq!(info.size, 12);
        let stored = store.read("c1", &info.id).unwrap();
        assert_eq!(stored.info, info);
        assert_eq!(stored.text.as_deref(), Some("fn main() {}"));
    }

    #[test]
    fn an_image_is_saved_and_returned_as_base64() {
        let dir = tempfile::tempdir().unwrap();
        let store = store(dir.path());

        let info = store.add("c1", "pic.png", PNG.to_vec()).unwrap();
        let image = store.image("c1", &info.id).unwrap();

        assert_eq!(info.kind, AttachmentKind::Image);
        assert_eq!(image.media_type, "image/png");
        assert_eq!(STANDARD.decode(image.data).unwrap(), PNG);
    }

    #[test]
    fn base64_content_is_decoded_and_saved() {
        let dir = tempfile::tempdir().unwrap();
        let store = store(dir.path());

        let info = store
            .add_base64("c1", "a.txt", &STANDARD.encode("hello"))
            .unwrap();

        assert_eq!(
            store.read("c1", &info.id).unwrap().text.as_deref(),
            Some("hello")
        );
    }

    #[test]
    fn broken_or_huge_base64_is_refused() {
        let dir = tempfile::tempdir().unwrap();
        let store = store(dir.path());

        let broken = store.add_base64("c1", "a.txt", "***").unwrap_err();
        let huge = store
            .add_base64("c1", "a.txt", &"A".repeat(MAX_FILE_BYTES / 3 * 4 + 100))
            .unwrap_err();

        assert_eq!(broken.kind, AppErrorKind::InvalidInput);
        assert_eq!(huge.kind, AppErrorKind::InvalidInput);
        assert!(huge.message.contains("大きすぎ"));
    }

    #[test]
    fn a_file_is_read_from_a_path_using_its_own_name() {
        let dir = tempfile::tempdir().unwrap();
        let store = store(dir.path());
        let path = dir.path().join("note.md");
        fs::write(&path, "# hi").unwrap();

        let info = store.add_path("c1", &path).unwrap();

        assert_eq!(info.filename, "note.md");
        assert_eq!(info.kind, AttachmentKind::Text);
    }

    #[test]
    fn a_directory_or_a_huge_file_is_not_read_from_a_path() {
        let dir = tempfile::tempdir().unwrap();
        let store = store(dir.path());
        let big = dir.path().join("big.txt");
        let file = fs::File::create(&big).unwrap();
        file.set_len(MAX_FILE_BYTES as u64 + 1).unwrap();

        let directory = store.add_path("c1", dir.path()).unwrap_err();
        let too_big = store.add_path("c1", &big).unwrap_err();

        assert_eq!(directory.kind, AppErrorKind::InvalidInput);
        assert!(too_big.message.contains("大きすぎ"));
    }

    #[test]
    fn only_images_can_be_loaded_as_images() {
        let dir = tempfile::tempdir().unwrap();
        let store = store(dir.path());
        let info = store.add("c1", "a.txt", b"hi".to_vec()).unwrap();

        let error = store.image("c1", &info.id).unwrap_err();

        assert_eq!(error.kind, AppErrorKind::InvalidInput);
    }

    #[test]
    fn the_file_name_is_cleaned_and_never_used_as_a_path() {
        let dir = tempfile::tempdir().unwrap();
        let store = store(dir.path());

        let info = store
            .add("c1", "..\\..\\evil/dir\\report\n.txt ", b"x".to_vec())
            .unwrap();
        let blank = store.add("c1", " /\\ ", b"x".to_vec()).unwrap();

        assert_eq!(info.filename, "report.txt");
        assert_eq!(blank.filename, "file");
        let names: Vec<_> = fs::read_dir(attachments_dir(dir.path(), "c1"))
            .unwrap()
            .map(|e| e.unwrap().file_name().into_string().unwrap())
            .collect();
        assert!(names.iter().all(|n| !n.contains("report")), "{names:?}");
        assert!(!dir.path().join("history").join("evil").exists());
    }

    #[test]
    fn a_too_large_file_is_rejected_without_writing() {
        let dir = tempfile::tempdir().unwrap();
        let store = store(dir.path());

        let error = store
            .add("c1", "big.txt", vec![b'a'; MAX_FILE_BYTES + 1])
            .unwrap_err();

        assert_eq!(error.kind, AppErrorKind::InvalidInput);
        assert!(error.message.contains("大きすぎます"), "{error}");
        assert!(!dir.path().join("history").exists());
    }

    #[test]
    fn unsupported_files_are_rejected_without_writing() {
        let dir = tempfile::tempdir().unwrap();
        let store = store(dir.path());

        assert!(store.add("c1", "a.bin", b"a\0b".to_vec()).is_err());
        assert!(!attachments_dir(dir.path(), "c1").exists());
    }

    #[test]
    fn ids_that_are_not_file_name_safe_are_rejected() {
        let dir = tempfile::tempdir().unwrap();
        let store = store(dir.path());
        let info = store.add("c1", "a.txt", b"hi".to_vec()).unwrap();

        for bad in ["../x", "a/b", "", "日本語"] {
            let kind = AppErrorKind::InvalidInput;
            assert_eq!(store.add(bad, "a", b"x".to_vec()).unwrap_err().kind, kind);
            assert_eq!(store.read(bad, &info.id).err().unwrap().kind, kind);
            assert_eq!(store.read("c1", bad).err().unwrap().kind, kind);
            assert_eq!(store.remove("c1", bad).unwrap_err().kind, kind);
        }
    }

    #[test]
    fn reading_something_missing_is_not_found() {
        let dir = tempfile::tempdir().unwrap();
        let store = store(dir.path());

        let error = store.read("c1", "nope").err().unwrap();

        assert_eq!(error.kind, AppErrorKind::NotFound);
    }

    #[test]
    fn remove_deletes_the_files_and_is_idempotent() {
        let dir = tempfile::tempdir().unwrap();
        let store = store(dir.path());
        let keep = store.add("c1", "keep.txt", b"k".to_vec()).unwrap();
        let drop = store.add("c1", "drop.txt", b"d".to_vec()).unwrap();

        store.remove("c1", &drop.id).unwrap();
        store.remove("c1", &drop.id).unwrap();

        assert_eq!(
            store.read("c1", &drop.id).err().unwrap().kind,
            AppErrorKind::NotFound
        );
        assert!(store.read("c1", &keep.id).is_ok());
    }

    #[test]
    fn deleting_a_conversation_removes_its_attachments_and_the_empty_directory() {
        let dir = tempfile::tempdir().unwrap();
        let store = store(dir.path());
        store.add("c1", "a.txt", b"a".to_vec()).unwrap();
        store.add("c2", "b.txt", b"b".to_vec()).unwrap();

        store.delete_conversation("c1").unwrap();
        store.delete_conversation("c1").unwrap();

        assert!(!dir.path().join("history").join("c1").exists());
        assert!(attachments_dir(dir.path(), "c2").exists());
    }

    #[test]
    fn references_are_read_from_file_parts_only() {
        let messages = [
            json!({"id": "m1", "role": "user", "parts": [
                {"type": "file", "url": "attachment://a1", "mediaType": "image/png"},
                {"type": "file", "url": "https://example.com/x.png", "mediaType": "image/png"},
                {"type": "text", "text": "attachment://a2"},
            ]}),
            json!({"id": "m2", "role": "assistant", "parts": []}),
        ];

        let ids = referenced_ids(&messages);

        assert_eq!(ids, HashSet::from(["a1".to_owned()]));
    }

    #[test]
    fn pruning_removes_only_old_unreferenced_attachments() {
        let dir = tempfile::tempdir().unwrap();
        let store = store(dir.path());
        let used = store.add("c1", "used.txt", b"u".to_vec()).unwrap();
        let old = store.add("c1", "old.txt", b"o".to_vec()).unwrap();
        let fresh = store.add("c1", "fresh.txt", b"f".to_vec()).unwrap();
        let adir = attachments_dir(dir.path(), "c1");
        for id in [&used.id, &old.id] {
            for ext in ["bin", "json"] {
                set_age(&adir.join(format!("{id}.{ext}")), day());
            }
        }
        let messages = [json!({"id": "m1", "role": "user", "parts": [
            {"type": "file", "url": format!("attachment://{}", used.id)},
        ]})];

        store
            .prune_unreferenced("c1", &messages, SystemTime::now())
            .unwrap();

        assert!(store.read("c1", &used.id).is_ok());
        assert!(store.read("c1", &fresh.id).is_ok());
        assert_eq!(
            store.read("c1", &old.id).err().unwrap().kind,
            AppErrorKind::NotFound
        );
    }

    #[test]
    fn orphaned_conversation_directories_are_pruned_only_when_old_and_without_a_json() {
        let dir = tempfile::tempdir().unwrap();
        let store = store(dir.path());
        let history = dir.path().join("history");
        let stale = store.add("stale", "a.txt", b"a".to_vec()).unwrap();
        let recent = store.add("recent", "b.txt", b"b".to_vec()).unwrap();
        let saved = store.add("saved", "c.txt", b"c".to_vec()).unwrap();
        fs::write(history.join("saved.json"), "{}").unwrap();
        for (conversation, info) in [("stale", &stale), ("saved", &saved)] {
            let adir = attachments_dir(dir.path(), conversation);
            for ext in ["bin", "json"] {
                set_age(&adir.join(format!("{}.{ext}", info.id)), day());
            }
        }

        let pruned = store.prune_orphans(SystemTime::now()).unwrap();

        assert_eq!(pruned, 1);
        assert!(!history.join("stale").exists());
        assert!(store.read("recent", &recent.id).is_ok());
        assert!(store.read("saved", &saved.id).is_ok());
    }

    #[test]
    fn pruning_a_missing_history_directory_is_fine() {
        let dir = tempfile::tempdir().unwrap();

        assert_eq!(
            store(dir.path()).prune_orphans(SystemTime::now()).unwrap(),
            0
        );
        assert!(
            store(dir.path())
                .prune_unreferenced("c1", &[], SystemTime::now())
                .is_ok()
        );
    }
}
