use std::sync::{Arc, Mutex};
use std::io::Cursor;
use image::GenericImageView;
use uuid::Uuid;
use wasm_bindgen::prelude::wasm_bindgen;
use wasm_bindgen_futures;
use oneshot;

use ehttp::multipart::MultipartBuilder;

use crate::{blurhash::get_blurhash, thumb::generate_thumbnail, checksum::hash_vec_to_string};


#[wasm_bindgen]
extern "C" {
    #[wasm_bindgen(js_namespace = console)]
    fn log(s: &str);
}

#[wasm_bindgen]
pub async fn upload_file(gallery_id: String, data: Vec<u8>) -> u16 {
    // Get checksum
    let sha256_hash = hash_vec_to_string(&data);
    
    // Encode lossless image
    // 一部の画像でサイズが異常に膨れ上がるので保留
    // log("[ColorBoard WASM] Encoding lossless WebP");
    // let lossless_data = encode_to_webp_lossless(&data);
    let img = image::load_from_memory(&data).unwrap();
    let (w, h) = img.dimensions();
    
    // Encode thumbnail
    log("[ColorBoard WASM] Encoding thumbnail WebP");
    let thumbnail_data = generate_thumbnail(&img, w, h);

    let tmp_id = Uuid::new_v4();
    let filename = format!("{}.webp", tmp_id);
    let thumbnail_filename = format!("{}_thumb.webp", tmp_id);

    // Get blurhash
    log("[ColorBoard WASM] Calculating blurhash...");
    let blurhash = get_blurhash(&thumbnail_data);
    log(&format!("generated: {}", &blurhash));
    
    log("[ColorBoard WASM] Uploading lossless image");

    let request = ehttp::Request::multipart(
        format!("/api/gallery/{}/upload", gallery_id),
        MultipartBuilder::new()
            .add_text("sha256", &sha256_hash)
            .add_text("width", &w.to_string())
            .add_text("height", &h.to_string())
            .add_text("blurhash", &blurhash)
            .add_stream(
                &mut Cursor::new(&data),
                "lossless_data",
                Some(&filename),
                None,
            )
            .unwrap()
            .add_stream(
                &mut Cursor::new(&thumbnail_data),
                "thumbnail_data",
                Some(&thumbnail_filename),
                None,
            )
            .unwrap(),
    );

    log("[ColorBoard WASM] Uploading...");

    let (tx, rx) = oneshot::channel();
    let status_code = Arc::new(Mutex::new(0));
    let status_code_clone = Arc::clone(&status_code);

    ehttp::fetch(request, move |response| {
        let mut status = status_code_clone.lock().unwrap();
        match response {
            Ok(response) => *status = response.status,
            Err(e) => {
                log(&format!("[Error] Failed to create multipart request: {}", e));
                *status = 1;
            }
        }
        tx.send(()).unwrap();
        log("[ColorBoard WASM] Done");
    });

    rx.await.unwrap();
    let status = *status_code.lock().unwrap();

    status
}
