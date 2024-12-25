"use client";
import Link from "next/link";
import { useEffect, useState } from "react";

import { Button } from "antd";

import { app } from "@/browser/api";
import { blurHashToDataURL } from "@/browser/blurhash";
import { GalleryWithImages } from "@/schema/api";


export default function Page({params,}: {
    params: Promise<{ id: string }>
}) {
    const [id, setId] = useState("");
    const [gallery, setGallery] = useState<GalleryWithImages | null>(null);

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
        <>
            <Link href={`/gallery/${id}/upload`}><Button type="default">Upload</Button></Link>

            <div className="mt-8">
                {gallery ? gallery.images.map((image) => (
                    <div key={image.id}>
                        <img id={`blurhash-${image.id}`} className="w-32 h-32 object-cover" width={image.width} height={image.height} />
                        <img
                            id={`thumbnail-${image.id}`}
                            className="hidden w-32 h-32 object-cover"
                            src={`/api/thumbnail/${image.thumbnailKey}`}
                            alt="Thumbnail of gallery image"
                            onLoad={
                                () => {
                                    // ロード完了時にblurhashを非表示にしてサムネイルを表示
                                    const thumb = document.getElementById(`thumbnail-${image.id}`) as HTMLImageElement;
                                    const img = document.getElementById(`blurhash-${image.id}`) as HTMLImageElement;
                                    if (img) {
                                        img.style.display = "none";
                                    }

                                    thumb!.style.display = "block";
                                }
                            }/>

                    </div>
                )) : (
                    <div>Loading...</div>
                )}
            </div>
        </>
    );
}
