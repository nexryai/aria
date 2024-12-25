"use client";
import Link from "next/link";
import { useEffect, useState } from "react";

import { Button } from "antd";
import { motion } from "motion/react";

import { app } from "@/browser/api";
import { blurHashToDataURL } from "@/browser/blurhash";
import { GalleryWithImages } from "@/schema/api";


export default function Page({params,}: {
    params: Promise<{ id: string }>
}) {
    const [id, setId] = useState("");
    const [gallery, setGallery] = useState<GalleryWithImages | null>(null);

    const blurInVariants = {
        hidden: {
            opacity: 0,
            filter: "blur(10px)",
        },
        visible: {
            opacity: 1,
            filter: "blur(0px)",
            transition: {
                duration: 0.4, // アニメーションの継続時間
                ease: "easeOut",
            },
        },
    };

    const fetchGallery = async (offset: number = 0) => {
        const id = (await params).id;
        setId(id);
        const { data } = await app.api.gallery({id}).get({query: {offset}});

        const gallery: GalleryWithImages = data;
        console.log(gallery);
        setGallery(gallery);
    };

    useEffect(() => {
        fetchGallery();
    }, [params]);

    useEffect(() => {
        if (gallery) {
            for (const image of gallery.images) {
                const img = document.getElementById(`blurhash-${image.id}`) as HTMLImageElement;
                if (img) {
                    img.src = blurHashToDataURL(image.blurhash) ?? "";
                }
            }
        }
    }, [gallery]);

    return (
        <div className="w-[80%] mx-auto">
            <Link href={`/gallery/${id}/upload`}><Button type="default">Upload</Button></Link>

            <div className="mt-8 flex flex-wrap">
                {gallery ? gallery.images.map((image) => (
                    <div key={image.id} className="relative w-32 h-32 overflow-hidden m-1">
                        <img id={`blurhash-${image.id}`} className="w-32 h-32 object-cover absolute top-0 left-0" width={image.width} height={image.height}/>

                        <motion.div
                            initial="hidden"
                            animate="visible"
                            variants={blurInVariants}
                        >
                            <img
                                id={`thumbnail-${image.id}`}
                                className="hidden w-32 h-32 object-cover absolute top-0 left-0"
                                src={`/api/thumbnail/${image.thumbnailKey}`}
                                alt="Thumbnail of gallery image"
                                onLoad={
                                    () => {
                                        // ロード完了時にblurhashを非表示にしてサムネイルを表示
                                        const thumb = document.getElementById(`thumbnail-${image.id}`) as HTMLImageElement;
                                        const blurhash = document.getElementById(`blurhash-${image.id}`) as HTMLImageElement;
                                        if (blurhash) {
                                            setTimeout(() => {
                                                blurhash.style.display = "none";
                                            }, 500);
                                        }

                                        thumb!.style.display = "block";
                                    }
                                }
                            />
                        </motion.div>

                    </div>
                )) : (
                    <div>Loading...</div>
                )}
            </div>
        </div>
    );
}
