use image::*;
use std::io::Cursor;

pub fn generate_thumbnail(data: &DynamicImage, w: u32, h: u32) -> Vec<u8> {
    // 720pのサイズにリサイズ
    // 縦と横、超過が大きい方に合わせる
    let size_factor = 360.0 / (w.max(h) as f64);

    let img: DynamicImage = image::DynamicImage::ImageRgba8(imageops::resize(
        data,
        (w as f64 * size_factor) as u32,
        (h as f64 * size_factor) as u32,
        imageops::FilterType::Triangle,
    ));

    // Create the WebP encoder for the above image
    let mut buf = Vec::new();
    img.write_to(&mut Cursor::new(&mut buf), ImageFormat::WebP)
        .unwrap();

    buf
}
