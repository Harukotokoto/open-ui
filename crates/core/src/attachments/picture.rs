//! 画像の取り込み。長辺が大きければ縮小して再エンコードする。

use std::io::Cursor;

use image::codecs::jpeg::JpegEncoder;
use image::imageops::FilterType;
use image::{ImageFormat, ImageReader, Limits};

use super::model::MAX_IMAGE_EDGE;
use crate::error::AppError;

/// 縮小後のJPEGの品質。
const JPEG_QUALITY: u8 = 85;
/// 展開を許す画像の辺の最大ピクセル数(巨大な画像でメモリを使い切らないため)。
const MAX_DECODE_EDGE: u32 = 16_384;

/// 送れる画像の形式。
pub(super) fn media_type(format: ImageFormat) -> Option<&'static str> {
    match format {
        ImageFormat::Png => Some("image/png"),
        ImageFormat::Jpeg => Some("image/jpeg"),
        ImageFormat::Gif => Some("image/gif"),
        ImageFormat::WebP => Some("image/webp"),
        _ => None,
    }
}

/// 取り込んだ画像のバイト列と、その形式。
pub(super) struct PreparedImage {
    pub bytes: Vec<u8>,
    pub media_type: &'static str,
}

/// 画像を送れる形にする。
///
/// 長辺が [`MAX_IMAGE_EDGE`] 以下なら、元のバイト列をそのまま使う(アニメーションGIFなどを壊さない)。
/// 超えるときは、縮小してから、透過があればPNG・なければJPEGで再エンコードする。
pub(super) fn prepare(bytes: Vec<u8>, format: ImageFormat) -> Result<PreparedImage, AppError> {
    let media = media_type(format).ok_or_else(unsupported)?;
    let (width, height) = dimensions(&bytes, format)?;
    if width.max(height) > MAX_DECODE_EDGE {
        return Err(AppError::invalid_input(format!(
            "画像が大きすぎます({width}×{height}ピクセル)。{MAX_DECODE_EDGE}ピクセル以下にしてください"
        )));
    }
    if width.max(height) <= MAX_IMAGE_EDGE {
        return Ok(PreparedImage {
            bytes,
            media_type: media,
        });
    }
    shrink(&bytes, format)
}

fn dimensions(bytes: &[u8], format: ImageFormat) -> Result<(u32, u32), AppError> {
    ImageReader::with_format(Cursor::new(bytes), format)
        .into_dimensions()
        .map_err(|_| broken())
}

fn shrink(bytes: &[u8], format: ImageFormat) -> Result<PreparedImage, AppError> {
    let mut reader = ImageReader::with_format(Cursor::new(bytes), format);
    let mut limits = Limits::default();
    limits.max_image_width = Some(MAX_DECODE_EDGE);
    limits.max_image_height = Some(MAX_DECODE_EDGE);
    reader.limits(limits);
    let decoded = reader.decode().map_err(|e| {
        AppError::invalid_input(format!(
            "画像を読み込めませんでした(縮小に失敗しました): {e}"
        ))
    })?;
    let resized = decoded.resize(MAX_IMAGE_EDGE, MAX_IMAGE_EDGE, FilterType::Lanczos3);

    let mut out = Cursor::new(Vec::new());
    let media_type = if resized.color().has_alpha() {
        resized
            .write_to(&mut out, ImageFormat::Png)
            .map_err(encode_failed)?;
        "image/png"
    } else {
        JpegEncoder::new_with_quality(&mut out, JPEG_QUALITY)
            .encode_image(&resized.to_rgb8())
            .map_err(encode_failed)?;
        "image/jpeg"
    };
    Ok(PreparedImage {
        bytes: out.into_inner(),
        media_type,
    })
}

fn unsupported() -> AppError {
    AppError::invalid_input("対応していない画像の形式です(PNG・JPEG・GIF・WebPに対応しています)")
}

fn broken() -> AppError {
    AppError::invalid_input("画像を読み込めませんでした。ファイルが壊れている可能性があります")
}

fn encode_failed(error: image::ImageError) -> AppError {
    AppError::internal(format!("画像を縮小して保存できませんでした: {error}"))
}

#[cfg(test)]
mod tests {
    use image::{DynamicImage, ImageBuffer, Rgb, Rgba};

    use super::*;

    fn encode(image: &DynamicImage, format: ImageFormat) -> Vec<u8> {
        let mut out = Cursor::new(Vec::new());
        image.write_to(&mut out, format).unwrap();
        out.into_inner()
    }

    fn rgb(width: u32, height: u32) -> DynamicImage {
        DynamicImage::ImageRgb8(ImageBuffer::from_pixel(width, height, Rgb([10, 120, 200])))
    }

    fn rgba(width: u32, height: u32) -> DynamicImage {
        DynamicImage::ImageRgba8(ImageBuffer::from_pixel(
            width,
            height,
            Rgba([10, 120, 200, 128]),
        ))
    }

    fn size_of(bytes: &[u8]) -> (u32, u32) {
        let format = image::guess_format(bytes).unwrap();
        dimensions(bytes, format).unwrap()
    }

    #[test]
    fn a_small_image_is_kept_byte_for_byte() {
        let png = encode(&rgb(64, 32), ImageFormat::Png);

        let prepared = prepare(png.clone(), ImageFormat::Png).unwrap();

        assert_eq!(prepared.bytes, png);
        assert_eq!(prepared.media_type, "image/png");
    }

    #[test]
    fn an_image_at_the_edge_limit_is_not_resized() {
        let png = encode(&rgb(MAX_IMAGE_EDGE, 8), ImageFormat::Png);

        let prepared = prepare(png.clone(), ImageFormat::Png).unwrap();

        assert_eq!(prepared.bytes, png);
    }

    #[test]
    fn a_large_opaque_image_is_shrunk_to_a_jpeg_keeping_the_aspect_ratio() {
        let png = encode(&rgb(4096, 2048), ImageFormat::Png);

        let prepared = prepare(png, ImageFormat::Png).unwrap();

        assert_eq!(prepared.media_type, "image/jpeg");
        assert_eq!(size_of(&prepared.bytes), (2048, 1024));
    }

    #[test]
    fn a_large_image_with_transparency_stays_a_png() {
        let png = encode(&rgba(1024, 3072), ImageFormat::Png);

        let prepared = prepare(png, ImageFormat::Png).unwrap();

        assert_eq!(prepared.media_type, "image/png");
        assert_eq!(size_of(&prepared.bytes), (683, 2048));
    }

    #[test]
    fn a_truncated_image_is_rejected() {
        let png = encode(&rgb(64, 64), ImageFormat::Png);

        assert!(prepare(png[..10].to_vec(), ImageFormat::Png).is_err());
    }

    #[test]
    fn formats_we_cannot_send_are_rejected() {
        // BMPのエンコーダーは有効にしていないので、先頭だけBMPの偽データで確かめる
        let bmp = b"BM\0\0\0\0\0\0\0\0\0\0".to_vec();

        let error = prepare(bmp, ImageFormat::Bmp).err().unwrap();

        assert!(error.message.contains("対応していない"), "{error}");
    }
}
