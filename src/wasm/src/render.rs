use wasm_bindgen::prelude::wasm_bindgen;
use wasm_bindgen::JsCast;

use crate::blurhash::decode_blurhash;

#[wasm_bindgen]
pub fn render_blurhash(element_id: String, hash: String) {
    //let hash: String = "LuNIK4?DI;aL~9o{NHwMt7Seofay".to_string();
    let pix = decode_blurhash(&hash);

    let document = web_sys::window().unwrap().document().unwrap();
    let canvas = document.get_element_by_id(&element_id).unwrap();
    let canvas: web_sys::HtmlCanvasElement = canvas
        .dyn_into::<web_sys::HtmlCanvasElement>()
        .map_err(|_| ())
        .unwrap();

    let context: web_sys::CanvasRenderingContext2d = canvas
        .get_context("2d")
        .unwrap()
        .unwrap()
        .dyn_into::<web_sys::CanvasRenderingContext2d>()
        .unwrap();

    // Vec<u8> を Uint8ClampedArray に変換
    let clamped_array = wasm_bindgen::Clamped(&pix[..]);
    let data = web_sys::ImageData::new_with_u8_clamped_array_and_sh(clamped_array, 50, 50).unwrap();

    // オフスクリーンキャンバスを作成し、ImageDataを描画
    let offscreen_canvas = document
        .create_element("canvas")
        .unwrap()
        .dyn_into::<web_sys::HtmlCanvasElement>()
        .unwrap();
    offscreen_canvas.set_width(50);
    offscreen_canvas.set_height(50);
    
    let offscreen_context: web_sys::CanvasRenderingContext2d = offscreen_canvas
        .get_context("2d")
        .unwrap()
        .unwrap()
        .dyn_into::<web_sys::CanvasRenderingContext2d>()
        .unwrap();
    
    offscreen_context.put_image_data(&data, 0.0, 0.0).unwrap();

    // オフスクリーンキャンバスからメインキャンバスに拡大して描画
    // context.clear_rect(0.0, 0.0, 150.0, 150.0); // メインキャンバスをクリア
    context.draw_image_with_html_canvas_element_and_dw_and_dh(
        &offscreen_canvas,
        0.0,
        0.0,
        150.0,
        150.0,
    ).unwrap();
}
