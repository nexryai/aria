"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import {
    DeleteOutlined,
    DownloadOutlined,
    ZoomInOutlined, ZoomOutOutlined
} from "@ant-design/icons";
import { Button, Image as AntImage, Popconfirm, PopconfirmProps } from "antd";
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

    const deleteConfirm: PopconfirmProps["onConfirm"] = () => {
        app.api.gallery({id}).delete().then((res) => {
            if (res.status === 401) {
                router.push("/login");
                return;
            }

            if (res.status === 200) {
                router.push("/");
            } else {
                alert("Failed to delete gallery");
            }
        });
    };

    const cancel: PopconfirmProps["onCancel"] = (e) => {
        console.log(e);
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
                <Popconfirm
                    className="mr-4"
                    title="Delete this gallery?"
                    description="Are you sure to delete this gallery?"
                    onConfirm={deleteConfirm}
                    onCancel={cancel}
                    okText="Yes"
                    cancelText="No"
                >
                    <Button type="text"><DeleteOutlined/></Button>
                </Popconfirm>
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

                                <AntImage
                                    id={`thumbnail-${image.id}`}
                                    className="w-32 h-32 object-cover absolute top-0 left-0"
                                    width={128}
                                    height={128}
                                    src={`/api/thumbnail/${image.thumbnailKey}`}
                                    preview={{
                                        src: `/api/image/${image.storageKey}`,
                                        toolbarRender: (
                                            _,
                                            {
                                                transform: { scale },
                                                actions: {
                                                    onZoomOut,
                                                    onZoomIn,
                                                    onReset,
                                                },
                                            },
                                        ) => (
                                            <div className="ant-image-preview-footer">
                                                <div className="ant-image-preview-operations">
                                                    <div className="ant-image-preview-operations-operation">
                                                        <DownloadOutlined onClick={() => {}} />
                                                    </div>
                                                    <div className="ant-image-preview-operations-operation">
                                                        <ZoomOutOutlined disabled={scale === 1} onClick={onZoomOut}/>
                                                    </div>
                                                    <div className="ant-image-preview-operations-operation">
                                                        <ZoomInOutlined disabled={scale === 50} onClick={onZoomIn}/>
                                                    </div>
                                                    <div className="ant-image-preview-operations-operation">
                                                        <DeleteOutlined onClick={onReset}/>
                                                    </div>
                                                </div>
                                            </div>
                                        ),
                                    }}
                                    alt="Thumbnail of gallery image"
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
