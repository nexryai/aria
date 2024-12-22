use blurhash::{encode, decode};
use image::*;

use crate::log;

pub fn get_blurhash(data: &Vec<u8>) -> String {
    let mut image = image::load_from_memory(data).unwrap();
    let (width, height) = image.dimensions();

    // 正方形にトリミングする
    let cropped_image = if width > height {
        let x_offset = (width - height) / 2;
        image.crop(x_offset, 0, height, height)
    } else {
        let y_offset = (height - width) / 2;
        image.crop(0, y_offset, width, width)
    };

    let (new_width, new_height) = cropped_image.dimensions();

    log(&format!("{}:{}", new_width, new_height));


    let result = encode(4, 3, new_width, new_height, &cropped_image.to_rgba8().into_vec());
    let blurhash = match result {
        Ok(hash) => hash,
        Err(e) => {
            log(&format!("[Fatal] failed to generate blurhash: {}", e));
            panic!()
        },
    };

    blurhash
}

pub fn decode_blurhash(hash: &String) -> Vec<u8> {
    let result = decode(hash, 50, 50, 1.0);
    let pixels = match result {
        Ok(pix) => pix,
        Err(e) => {
            log(&format!("[Fatal] failed to decode blurhash: {}", e));
            panic!()
        },
    };

    pixels
}
