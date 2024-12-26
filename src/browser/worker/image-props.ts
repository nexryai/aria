import initWasm, { get_image_props as getImageProps } from "@/wasm/pkg";

const wasmInitialized = initWasm();
self.onmessage = async (event: MessageEvent) => {
    const { file }: { file: Uint8Array<ArrayBuffer> } = event.data;

    try {
        await wasmInitialized;

        console.log("[ImagePropsWorker] Getting image properties...");
        const imageProps: {
            width: number;
            height: number;
            blurhash: string;
            checksum: string;
        } = await getImageProps(file);

        self.postMessage(imageProps);
    } catch (error) {
        self.postMessage({ error: (error as Error).message });
    }
};
