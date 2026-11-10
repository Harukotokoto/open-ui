//! 添付への参照を、サーバーへ送るメッセージにする。
//!
//! - テキスト・PDF: 本文を `<file name="…">…</file>` で囲み、ユーザーの文章の前に足す
//! - 画像: base64にして、画像パーツとして付ける

use base64::Engine;
use base64::engine::general_purpose::STANDARD;

use super::model::{AttachmentKind, MAX_FILES_PER_MESSAGE, MAX_TOTAL_BYTES_PER_MESSAGE};
use super::store::{AttachmentStore, Stored};
use crate::api::{Role, WireImage, WireMessage};
use crate::chat::ChatMessage;
use crate::error::AppError;

impl AttachmentStore {
    /// フロントが送ったメッセージ列を、サーバーへ送る形にする。
    ///
    /// 添付があるメッセージには、`conversation_id` が要る。1メッセージのファイル数と合計サイズの
    /// 上限もここで確かめる(画面の検査は親切のためで、守るのはここ)。
    pub fn resolve(
        &self,
        conversation_id: Option<&str>,
        messages: &[ChatMessage],
    ) -> Result<Vec<WireMessage>, AppError> {
        messages
            .iter()
            .map(|message| self.resolve_one(conversation_id, message))
            .collect()
    }

    fn resolve_one(
        &self,
        conversation_id: Option<&str>,
        message: &ChatMessage,
    ) -> Result<WireMessage, AppError> {
        if message.attachments.is_empty() {
            return Ok(WireMessage::text(message.role, message.content.clone()));
        }
        if message.role != Role::User {
            return Err(AppError::invalid_input(
                "ユーザー以外のメッセージには添付できません",
            ));
        }
        let conversation_id = conversation_id
            .ok_or_else(|| AppError::invalid_input("添付ファイルの会話が指定されていません"))?;
        if message.attachments.len() > MAX_FILES_PER_MESSAGE {
            return Err(too_many());
        }

        let mut files = Vec::with_capacity(message.attachments.len());
        let mut total = 0usize;
        for id in &message.attachments {
            let stored = self.read(conversation_id, id)?;
            total += stored.bytes.len();
            if total > MAX_TOTAL_BYTES_PER_MESSAGE {
                return Err(too_big());
            }
            files.push(stored);
        }
        Ok(compose(&message.content, files))
    }
}

/// ファイルとユーザーの文章を、1つのメッセージにまとめる。
fn compose(text: &str, files: Vec<Stored>) -> WireMessage {
    let mut sections = Vec::new();
    let mut images = Vec::new();
    for file in files {
        match file.info.kind {
            AttachmentKind::Image => images.push(WireImage {
                media_type: file.info.media_type,
                data_base64: STANDARD.encode(&file.bytes),
            }),
            AttachmentKind::Text | AttachmentKind::Pdf => {
                let body = file.text.unwrap_or_default();
                sections.push(format!(
                    "<file name=\"{}\">\n{}\n</file>",
                    attribute(&file.info.filename),
                    body.trim_end()
                ));
            }
        }
    }
    if !text.trim().is_empty() {
        sections.push(text.to_owned());
    }
    WireMessage {
        role: Role::User,
        content: sections.join("\n\n"),
        images,
    }
}

/// 属性値に入れても壊れないようにする。
fn attribute(name: &str) -> String {
    name.replace('"', "'")
}

fn too_many() -> AppError {
    AppError::invalid_input(format!(
        "1回に添付できるのは{MAX_FILES_PER_MESSAGE}ファイルまでです"
    ))
}

fn too_big() -> AppError {
    AppError::invalid_input(format!(
        "添付ファイルの合計は{}MBまでです",
        MAX_TOTAL_BYTES_PER_MESSAGE / 1024 / 1024
    ))
}

#[cfg(test)]
mod tests {
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

    fn store(dir: &std::path::Path) -> AttachmentStore {
        AttachmentStore::new(dir.join("history"))
    }

    fn user(text: &str, attachments: &[&str]) -> ChatMessage {
        ChatMessage {
            role: Role::User,
            content: text.to_owned(),
            attachments: attachments.iter().map(|id| (*id).to_owned()).collect(),
        }
    }

    #[test]
    fn messages_without_attachments_pass_through() {
        let dir = tempfile::tempdir().unwrap();
        let store = store(dir.path());
        let messages = [
            user("こんにちは", &[]),
            ChatMessage {
                role: Role::Assistant,
                content: "やあ".into(),
                attachments: vec![],
            },
        ];

        let resolved = store.resolve(None, &messages).unwrap();

        assert_eq!(
            resolved,
            [
                WireMessage::text(Role::User, "こんにちは".into()),
                WireMessage::text(Role::Assistant, "やあ".into())
            ]
        );
    }

    #[test]
    fn text_files_are_put_before_the_users_words() {
        let dir = tempfile::tempdir().unwrap();
        let store = store(dir.path());
        let a = store.add("c1", "a.rs", b"fn a() {}\n".to_vec()).unwrap();
        let b = store.add("c1", "b \"q\".txt", b"bee".to_vec()).unwrap();

        let resolved = store
            .resolve(Some("c1"), &[user("説明して", &[&a.id, &b.id])])
            .unwrap();

        assert_eq!(resolved.len(), 1);
        assert_eq!(
            resolved[0].content,
            "<file name=\"a.rs\">\nfn a() {}\n</file>\n\n<file name=\"b 'q'.txt\">\nbee\n</file>\n\n説明して"
        );
        assert!(resolved[0].images.is_empty());
    }

    #[test]
    fn images_become_image_parts_and_a_file_only_message_has_no_user_text() {
        let dir = tempfile::tempdir().unwrap();
        let store = store(dir.path());
        let image = store.add("c1", "p.png", PNG.to_vec()).unwrap();

        let resolved = store
            .resolve(Some("c1"), &[user("", &[&image.id])])
            .unwrap();

        assert_eq!(resolved[0].content, "");
        assert_eq!(resolved[0].images.len(), 1);
        assert_eq!(resolved[0].images[0].media_type, "image/png");
        assert_eq!(
            STANDARD.decode(&resolved[0].images[0].data_base64).unwrap(),
            PNG
        );
    }

    #[test]
    fn a_missing_attachment_fails_the_request() {
        let dir = tempfile::tempdir().unwrap();
        let store = store(dir.path());

        let error = store
            .resolve(Some("c1"), &[user("x", &["gone"])])
            .unwrap_err();

        assert_eq!(error.kind, AppErrorKind::NotFound);
    }

    #[test]
    fn attachments_need_a_conversation_and_a_user_message() {
        let dir = tempfile::tempdir().unwrap();
        let store = store(dir.path());
        let a = store.add("c1", "a.txt", b"a".to_vec()).unwrap();
        let from_assistant = ChatMessage {
            role: Role::Assistant,
            ..user("x", &[&a.id])
        };

        assert_eq!(
            store
                .resolve(None, &[user("x", &[&a.id])])
                .unwrap_err()
                .kind,
            AppErrorKind::InvalidInput
        );
        assert_eq!(
            store
                .resolve(Some("c1"), &[from_assistant])
                .unwrap_err()
                .kind,
            AppErrorKind::InvalidInput
        );
    }

    #[test]
    fn the_file_count_and_total_size_are_limited_per_message() {
        let dir = tempfile::tempdir().unwrap();
        let store = store(dir.path());
        let one = store.add("c1", "a.txt", b"a".to_vec()).unwrap();
        let ids: Vec<&str> = vec![one.id.as_str(); MAX_FILES_PER_MESSAGE + 1];
        let big = vec![b'a'; crate::attachments::MAX_FILE_BYTES];
        let big_ids: Vec<String> = (0..3)
            .map(|i| {
                store
                    .add("c1", &format!("big{i}.txt"), big.clone())
                    .unwrap()
                    .id
            })
            .collect();
        let big_refs: Vec<&str> = big_ids.iter().map(String::as_str).collect();

        let too_many = store.resolve(Some("c1"), &[user("x", &ids)]).unwrap_err();
        let too_big = store
            .resolve(Some("c1"), &[user("x", &big_refs)])
            .unwrap_err();

        assert!(too_many.message.contains("ファイルまで"), "{too_many}");
        assert!(too_big.message.contains("合計"), "{too_big}");
    }
}
