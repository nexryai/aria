self.onmessage = async (event: MessageEvent) => {
    const { file }: { file: ArrayBuffer } = event.data;
    console.log("[ThumbnailWorker] Generating thumbnail...");

    try {
        // ArrayBufferをBlobに変換しImageBitmapを生成
        const blob = new Blob([file]);
        const imageBitmap = await createImageBitmap(blob);

        // 720pリサイズ設定
        const targetWidth = 1280;
        const targetHeight = 720;

        // アスペクト比を計算
        const aspectRatio = imageBitmap.width / imageBitmap.height;
        let resizeWidth = targetWidth;
        let resizeHeight = targetHeight;

        if (aspectRatio > 1) {
            resizeHeight = targetWidth / aspectRatio; // 横長画像
        } else {
            resizeWidth = targetHeight * aspectRatio; // 縦長画像
        }

        // OffscreenCanvasを使用して画像をリサイズ
        const offscreenCanvas = new OffscreenCanvas(targetWidth, targetHeight);
        const ctx = offscreenCanvas.getContext("2d");

        if (!ctx) throw new Error("2Dコンテキストの取得に失敗しました");

        // 背景を黒で塗りつぶし
        ctx.fillStyle = "black";
        ctx.fillRect(0, 0, targetWidth, targetHeight);

        // リサイズ画像を中央に描画
        ctx.drawImage(
            imageBitmap,
            (targetWidth - resizeWidth) / 2, // x
            (targetHeight - resizeHeight) / 2, // y
            resizeWidth,
            resizeHeight
        );

        // WebP形式に変換
        const webpBlob = await offscreenCanvas.convertToBlob({
            type: "image/webp",
            quality: 0.8,
        });

        // メインスレッドに送信
        console.log("[ThumbnailWorker] Done!");
        self.postMessage({ success: true, blob: webpBlob });
    } catch (error) {
        self.postMessage({ success: false, error: (error as Error).message });
    }
};
