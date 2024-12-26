"use client";
import { useEffect, useState } from "react";

import {
    CheckCircleOutlined,
    CloseCircleOutlined,
    CloudUploadOutlined,
    LoadingOutlined,
    PlusOutlined
} from "@ant-design/icons";
import { Button } from "antd";
import { AnimatePresence, motion } from "motion/react";
import { useDropzone } from "react-dropzone";

import { app } from "@/browser/api";
import { isSafari } from "@/browser/env";


export default function Page({params,}: {
    params: Promise<{ id: string }>
}) {
    const isSupportedBrowser = !isSafari();
    const [thumbnailWorker, setThumbnailWorker] = useState<Worker>();
    const [imagePropsWorker, setImagePropsWorker] = useState<Worker>();
    const [galleryId, setGalleryId] = useState("");
    const [uploadQueue, setUploadQueue] = useState<
        {
            name: string;
            done: boolean,
            file: File,
            isUploading: boolean
        }[]
    >([]);
    const [uploadedFiles, setUploadedFiles] = useState<{ name: string }[]>([]);
    const [failedFiles, setFailedFiles] = useState<
        { name: string; reason?: string }[]
    >([]);

    useEffect(() => {
        (async () => {
            const {id} = await params;
            setGalleryId(id);
        })();

        setThumbnailWorker(new Worker(new URL("@/browser/worker/thumbnail", import.meta.url)));
        setImagePropsWorker(new Worker(new URL("@/browser/worker/image-props", import.meta.url)));

        console.log("Workers initialized");
    }, [params]);

    const { getRootProps, getInputProps } = useDropzone({
        onDrop: (acceptedFiles, fileRejections) => {
            const newQueue = acceptedFiles.map((file) => ({
                name: file.name,
                done: false,
                file,
                isUploading: false,
            }));
            setUploadQueue((prev) => [...prev, ...newQueue]);
            setFailedFiles((prev) => [
                ...prev,
                ...fileRejections.map((rej) => ({
                    name: rej.file.name,
                    reason: "Rejected by dropzone",
                })),
            ]);
        },
    });

    const waitForThumbnail = (worker: Worker, file: Uint8Array): Promise<Blob> => {
        return new Promise((resolve, reject) => {
            worker.postMessage({ file });

            worker.onmessage = (e: MessageEvent) => {
                const { success, blob, error } = e.data;

                if (success && blob) {
                    resolve(blob); //サムネイルのBlobを返す
                } else {
                    reject(error);
                }
            };
        });
    };

    const waitForImageProps = (worker: Worker, file: Uint8Array): Promise<{
        width: number;
        height: number;
        blurhash: string;
        checksum: string;
    }> => {
        return new Promise((resolve, reject) => {
            worker.postMessage({ file });

            worker.onmessage = (e: MessageEvent) => {
                const { width, height, blurhash, checksum, error } = e.data;

                if (width && height && blurhash && checksum) {
                    resolve({ width, height, blurhash, checksum });
                } else {
                    reject(error);
                }
            };
        });
    };

    const processUpload = async () => {
        if (!thumbnailWorker || !imagePropsWorker) {
            console.error("worker(s) is not initialized");
            return;
        }

        for (let i = 0; i < uploadQueue.length; i++) {
            const currentFile = uploadQueue[i];
            console.group(`Processing ${currentFile.name}`);

            try {
                const imageBuffer = new Uint8Array(await currentFile.file.arrayBuffer());

                console.log("Getting image properties...");
                const imageProps = await waitForImageProps(imagePropsWorker, imageBuffer);
                if (!imageProps) {
                    throw new Error("Failed to get image properties");
                }

                console.log("Getting signed URLs...");
                const signedUrls = await app.api.gallery({id: galleryId}).upload.post({
                    sha256Hash: imageProps.checksum,
                    blurhash: imageProps.blurhash,
                    width: imageProps.width,
                    height: imageProps.height,
                });

                if (!signedUrls.response.ok) {
                    if (signedUrls.response.status === 409) {
                        setFailedFiles((prev) => [
                            ...prev,
                            { name: currentFile.name, reason: "The same file already exists." },
                        ]);

                        console.warn("The same file already exists. Skipping...");
                        continue;
                    } else {
                        throw new Error("Failed to get signed URLs");
                    }
                }

                const { imageUploadUrl, thumbnailUploadUrl }: { imageUploadUrl: string, thumbnailUploadUrl: string } = signedUrls.data;

                // PUT request to signedUrl
                const imageUploadResponse = await fetch(imageUploadUrl, {
                    method: "PUT",
                    body: imageBuffer,
                });

                if (!imageUploadResponse.ok) {
                    setFailedFiles((prev) => [
                        ...prev,
                        {
                            name: currentFile.name,
                            reason: `Failed to upload image. Response code was ${imageUploadResponse.status}`,
                        },
                    ]);

                    continue;
                }

                // Create thumbnail
                const thumbnailBlob = await waitForThumbnail(thumbnailWorker, imageBuffer);
                const thumbnailUploadResponse = await fetch(thumbnailUploadUrl, {
                    method: "PUT",
                    body: await thumbnailBlob.arrayBuffer(),
                });

                if (!thumbnailUploadResponse.ok) {
                    setFailedFiles((prev) => [
                        ...prev,
                        {
                            name: currentFile.name,
                            reason: `Failed to upload thumbnail. Response code was ${thumbnailUploadResponse.status}`,
                        },
                    ]);

                    continue;
                }

                // ここまで来たら成功
                setUploadedFiles((prev) => [...prev, { name: currentFile.name }]);
            } catch (e) {
                console.error("Failed to process image", e);
                setFailedFiles((prev) => [
                    ...prev,
                    {
                        name: currentFile.name,
                        reason: `Failed to process image: ${e}`,
                    },
                ]);
            } finally {
                console.groupEnd();
                setUploadQueue((prev) =>
                    prev.map((item, index) =>
                        index === i ? {
                            ...item,
                            isUploading: false,
                            done: true
                        } : item
                    )
                );
            }
        }

        console.log("All files processed");
        setUploadQueue([]);
    };

    const upload = async () => {
        // isUploadingが無効な項目全てをtrueにする
        setUploadQueue((prev) => prev.map((item) => ({ ...item, isUploading: true })));

        if (uploadQueue.some((item) => !item.done)) {
            await processUpload();
        }
    };

    return (
        <div className="w-[80%] mx-auto">
            <div className={`${isSupportedBrowser ? "flex justify-between " : "hidden"}`}>
                <div className="mr-16">
                    <div className="mt-8 mb-8 p-16 border rounded-lg" {...getRootProps()}>
                        <input {...getInputProps()} />
                        <p>Drag & drop some files here, or click to select files</p>
                    </div>

                    <div className="flex justify-end">
                        <Button type="primary" icon={<CloudUploadOutlined/>} onClick={upload}>Start Uploading</Button>
                    </div>
                </div>
                <div className="rounded-lg bg-zinc-50 p-4 w-[40%] overflow-hidden">
                    <p>Queue</p>
                    <AnimatePresence>
                        {uploadQueue.map((item, index) => (
                            (item.isUploading || !item.done) && (
                                <motion.div
                                    key={index}
                                    className="flex m-4 p-4 border border-gray-200 rounded-lg"
                                    initial={{opacity: 0, y: 70}}
                                    animate={{opacity: 1, y: 0}}
                                    exit={{opacity: 0, x: 70}}
                                >
                                    {
                                        item.isUploading ? (
                                            <LoadingOutlined className="mt-1 mr-2 h-4 w-4"/>
                                        ) : !item.done && (
                                            <PlusOutlined className="mt-1 mr-2 h-4 w-4"/>
                                        )
                                    }
                                    {item.name}
                                </motion.div>
                            )
                        ))}
                    </AnimatePresence>

                    <p className="mt-8">Errors</p>
                    <AnimatePresence>
                        {failedFiles.map((failed, index) => (
                            <motion.div
                                key={index}
                                className="text-orange-700 flex m-4 p-4 border border-orange-700 rounded-lg"
                                initial={{opacity: 0, y: 70}}
                                animate={{opacity: 1, y: 0}}
                                exit={{opacity: 0, x: 70}}
                            >
                                <CloseCircleOutlined className="mt-1 mr-2 h-4 w-4"/>
                                {failed.name}: {failed.reason || "Failed to process image"}
                            </motion.div>
                        ))}
                    </AnimatePresence>

                    <p className="mt-8">Uploaded files</p>
                    <AnimatePresence>
                        {uploadedFiles.map((upload, index) => (
                            <motion.div
                                key={index}
                                className="text-green-700 flex m-4 p-4 border border-green-700 rounded-lg"
                                initial={{opacity: 0, y: 70}}
                                animate={{opacity: 1, y: 0}}
                                exit={{opacity: 0, x: 70}}
                            >
                                <CheckCircleOutlined className="mt-1 mr-2 h-4 w-4"/>
                                {upload.name}
                            </motion.div>
                        ))}
                    </AnimatePresence>
                </div>
            </div>
            {!isSupportedBrowser && (
                <div className="mt-48">
                    <p>Sorry, Uploading images from Safari is not supported because it does not support WebP in <code>offscreenCanvas.convertToBlob()</code>.</p>
                    <p>Please use another browser.</p>
                </div>
            )}
        </div>
    );
}
