//! ファイルの中身から、添付の種類を決めて、送れる形にする。
//!
//! 拡張子やブラウザが付けた型は信用しない(間違っていることがあり、偽装もできる)。
//! 判定の順: 画像(先頭のバイト列)→ PDF(ヘッダ)→ テキスト(UTF-8で、NULを含まない)。

use super::model::AttachmentKind;
use super::pdf;
use super::picture::{self, PreparedImage};
use crate::error::AppError;

/// 取り込み済みの中身。保存するバイト列と、種類ごとの付随情報。
pub(super) struct Prepared {
    pub kind: AttachmentKind,
    pub media_type: String,
    /// 保存するバイト列(画像は縮小後)
    pub bytes: Vec<u8>,
    /// PDFから取り出したテキスト
    pub extracted_text: Option<String>,
}

pub(super) fn prepare(bytes: Vec<u8>) -> Result<Prepared, AppError> {
    if bytes.is_empty() {
        return Err(AppError::invalid_input("ファイルが空です"));
    }
    if let Ok(format) = ::image::guess_format(&bytes) {
        let PreparedImage { bytes, media_type } = picture::prepare(bytes, format)?;
        return Ok(Prepared {
            kind: AttachmentKind::Image,
            media_type: media_type.to_owned(),
            bytes,
            extracted_text: None,
        });
    }
    if pdf::is_pdf(&bytes) {
        let text = pdf::extract_text(bytes.clone())?;
        return Ok(Prepared {
            kind: AttachmentKind::Pdf,
            media_type: "application/pdf".to_owned(),
            bytes,
            extracted_text: Some(text),
        });
    }
    if is_text(&bytes) {
        return Ok(Prepared {
            kind: AttachmentKind::Text,
            media_type: "text/plain".to_owned(),
            bytes,
            extracted_text: None,
        });
    }
    Err(AppError::invalid_input(
        "対応していないファイルです。画像(PNG・JPEG・GIF・WebP)・PDF・UTF-8のテキストに対応しています",
    ))
}

/// UTF-8のテキストか(バイナリが混じっていない)。先頭のBOMは許す。
fn is_text(bytes: &[u8]) -> bool {
    let body = bytes.strip_prefix(b"\xEF\xBB\xBF").unwrap_or(bytes);
    !body.contains(&0) && std::str::from_utf8(body).is_ok()
}

/// 保存したテキストの添付を文字列にする。先頭のBOMは除く。
pub(super) fn decode_text(bytes: &[u8]) -> String {
    let body = bytes.strip_prefix(b"\xEF\xBB\xBF").unwrap_or(bytes);
    String::from_utf8_lossy(body).into_owned()
}

#[cfg(test)]
mod tests {
    use super::*;

    /// 1×1のPNG。
    const PNG: &[u8] = &[
        0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0x00, 0x00, 0x00, 0x0D, 0x49, 0x48, 0x44,
        0x52, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01, 0x08, 0x06, 0x00, 0x00, 0x00, 0x1F,
        0x15, 0xC4, 0x89, 0x00, 0x00, 0x00, 0x0D, 0x49, 0x44, 0x41, 0x54, 0x78, 0x9C, 0x63, 0xF8,
        0xFF, 0xFF, 0x3F, 0x00, 0x05, 0xFE, 0x02, 0xFE, 0xDC, 0xCC, 0x59, 0xE7, 0x00, 0x00, 0x00,
        0x00, 0x49, 0x45, 0x4E, 0x44, 0xAE, 0x42, 0x60, 0x82,
    ];

    #[test]
    fn images_are_recognized_by_content() {
        let prepared = prepare(PNG.to_vec()).unwrap();

        assert_eq!(prepared.kind, AttachmentKind::Image);
        assert_eq!(prepared.media_type, "image/png");
        assert_eq!(prepared.bytes, PNG);
    }

    #[test]
    fn text_including_japanese_and_a_bom_is_accepted() {
        let plain = prepare("fn main() {}\n".as_bytes().to_vec()).unwrap();
        let japanese = prepare("こんにちは\n".as_bytes().to_vec()).unwrap();
        let bom = prepare(b"\xEF\xBB\xBFhello".to_vec()).unwrap();

        assert_eq!(plain.kind, AttachmentKind::Text);
        assert_eq!(japanese.kind, AttachmentKind::Text);
        assert_eq!(bom.kind, AttachmentKind::Text);
        assert_eq!(decode_text(b"\xEF\xBB\xBFhello"), "hello");
    }

    #[test]
    fn binary_and_non_utf8_files_are_rejected() {
        let with_nul = prepare(b"abc\0def".to_vec());
        // Shift_JISの「あ」
        let shift_jis = prepare(vec![0x82, 0xA0]);
        let empty = prepare(Vec::new());

        assert!(with_nul.is_err());
        assert!(shift_jis.is_err());
        assert!(empty.is_err());
    }

    #[test]
    fn a_wrong_extension_does_not_matter_because_only_content_is_read() {
        // 画像のバイト列は、名前が何であっても画像として扱う
        assert_eq!(prepare(PNG.to_vec()).unwrap().kind, AttachmentKind::Image);
    }
}
