"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { Button } from "antd";
import { motion } from "motion/react";

import { app } from "@/browser/api";
import { blurHashToDataURL } from "@/browser/blurhash";
import { XInfiniteScrollContainer } from "@/components/core/InfiniteScroll";
import { GalleryWithImages } from "@/schema/api";


export default function Page({params,}: {
    params: Promise<{ id: string }>
}) {
    let isFetching = false;
    let noMoreFetch = false;
    const router = useRouter();
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
        const { data, status } = await app.api.gallery({id}).get({query: {offset}});
        if (status === 401) {
            router.push("/login");
            return;
        }

        const fetched: GalleryWithImages = data;
        if (fetched?.images.length == 0) {
            noMoreFetch = true;
            return;
        }

        if (gallery) {
            setGallery({
                ...gallery,
                images: [
                    ...gallery.images,
                    ...fetched.images,
                ]
            });
        } else {
            setGallery(fetched);
        }
    };

    const fetchMore = () => {
        if (gallery && !noMoreFetch && !isFetching) {
            isFetching = true;
            fetchGallery(gallery.images.length).then(() => {
                isFetching = false;
            });
        }
    };

    useEffect(() => {
        isFetching = true;
        fetchGallery().then(() => {
            isFetching = false;
        });
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
            <div className="flex justify-end">
                <Link href={`/gallery/${id}/upload`}>
                    <Button type="default">Upload</Button>
                </Link>
            </div>
            <XInfiniteScrollContainer fetchMore={() => {fetchMore();}}>
                <div className="mt-8 flex flex-wrap justify-center gap-1">
                    {gallery ? gallery.images.map((image) => (
                        <div key={image.id} className="relative w-32 h-32 overflow-hidden">
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
                                            // ロード完了時にサムネイルを表示
                                            const thumb = document.getElementById(`thumbnail-${image.id}`) as HTMLImageElement;
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
            </XInfiniteScrollContainer>
        </div>
    );
}
