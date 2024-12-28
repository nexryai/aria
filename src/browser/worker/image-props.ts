import initWasm, { get_image_props as getImageProps } from "@/wasm/pkg";

const wasmInitialized = initWasm();
self.onmessage = async (event: MessageEvent) => {
    const { file }: { file: Uint8Array<ArrayBuffer> } = event.data;

    try {
        await wasmInitialized;
        console.log("[ImagePropsWorker] Getting image properties...");

        const fetchProps = async () => {
            const imageProps: {
                width: number;
                height: number;
                blurhash: string;
                checksum: string;
            } = await getImageProps(file);

            self.postMessage(imageProps);
        };

        // 現状WASMで発生したpanicをキャッチする方法がない
        // https://rajrajhans.com/2023/07/handling-rust-panics-in-wasm/
        await Promise.race([
            fetchProps(),
            new Promise((_, reject) => {
                setTimeout(() => {
                    reject(new Error("Image processing timed out"));
                }, 20000);
            }),
        ]);
    } catch (error) {
        console.log("WASM error:", error);
        self.postMessage({ error: (error as Error).message });
    }
};
