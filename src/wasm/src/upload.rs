use image::GenericImageView;
use wasm_bindgen::prelude::*;
use serde::{Deserialize, Serialize};
use crate::{blurhash::get_blurhash, thumb::generate_thumbnail, checksum::hash_vec_to_string};

#[wasm_bindgen]
extern "C" {
    #[wasm_bindgen(js_namespace = console)]
    fn log(s: &str);
}

// 返却用の構造体
#[derive(Serialize, Deserialize)]
pub struct UploadResult {
    pub width: u32,
    pub height: u32,
    pub blurhash: String,
    pub checksum: String,
}

#[wasm_bindgen]
pub async fn upload_file(data: Vec<u8>) -> JsValue {
    // Get checksum
    let sha256_hash = hash_vec_to_string(&data);

    // Load image
    let img = image::load_from_memory(&data).unwrap();
    let (w, h) = img.dimensions();

    // Get blurhash
    log("[ColorBoard WASM] Calculating blurhash...");
    let thumbnail_data = generate_thumbnail(&img, w, h);
    let blurhash = get_blurhash(&thumbnail_data);
    log(&format!("generated: {}", &blurhash));


    // 構造体を作成
    let result = UploadResult {
        width: w,
        height: h,
        blurhash,
        checksum: sha256_hash,
    };

    serde_wasm_bindgen::to_value(&result).map_err(|e| JsValue::from_str(&e.to_string())).unwrap()
}