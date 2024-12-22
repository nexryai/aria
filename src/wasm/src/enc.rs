use image::*;
use std::io::Cursor;

pub fn encode_to_webp_lossless(data: &Vec<u8>) -> Vec<u8> {
    let img = image::load_from_memory(data).unwrap();
    let mut buf = Vec::new();
    img.write_to(&mut Cursor::new(&mut buf), ImageFormat::WebP)
        .unwrap();

    buf
}
