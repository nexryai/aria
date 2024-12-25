"use client";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { FolderOutlined, PlusOutlined } from "@ant-design/icons";
import { Button, Drawer, Input } from "antd";

import { app } from "@/browser/api";
import { isSignedIn } from "@/browser/auth";
import { GallerySummary } from "@/schema/api";


export default function Home() {
    const router = useRouter();
    const [signedIn, setSignedIn] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [addGalleryDrawerIsOpen, setAddGalleryDrawerIsOpen] = useState(false);

    const [galleries, setGalleries] = useState<GallerySummary[]>([]);

    const fetchGalleries = async () => {
        const res = await app.api.gallery.get();
        if (res.response.ok) {
            const data: GallerySummary[] = res.data;
            setGalleries(data);
        } else {
            if (res.response.status === 401) {
                router.push("/login");
            }
            console.error(res.error);
        }
    };

    const addGallery = async () => {
        const name = (document.getElementById("new-gallery-name") as HTMLInputElement).value;
        const res = await app.api.gallery.post({name});
        if (res.response.ok) {
            setAddGalleryDrawerIsOpen(false);
            location.reload();
        } else {
            console.error(res.error);
        }
    };

    useEffect(() => {
        isSignedIn().then((signedIn) => {
            setSignedIn(signedIn);
            fetchGalleries().then(() => {
                setIsLoading(false);
            });
        });
    }, []);

    return (
        <div className="w-[80%] mx-auto">
            {isLoading && <p>Loading...</p> }
            {!isLoading && !signedIn &&
                <div className="flex flex-col gap-3 w-32 mx-auto mt-52">
                    <span>Powered by</span>
                    <Image
                        className="dark:invert"
                        src="/next.svg"
                        alt="Next.js logo"
                        width={180}
                        height={38}
                        priority
                    />
                </div>
            }
            {!isLoading && signedIn &&
                <>
                    <div className="flex justify-between">
                        <span className="text-xl">Gallery</span>
                        <Button icon={<PlusOutlined />} onClick={() => setAddGalleryDrawerIsOpen(true)} type="default">Add</Button>
                    </div>
                    <div className="flex flex-wrap gap-4">
                        {galleries.map((gallery) => (
                            <Link key={gallery.id} href={`gallery/${gallery.id}`}>
                                <div className="flex gap-3 mt-4 border rounded-lg p-4 w-64">
                                    <div>
                                        <FolderOutlined />
                                    </div>
                                    <div>
                                        <span>{gallery.name}</span>
                                    </div>
                                </div>
                            </Link>
                        ))}
                    </div>
                </>
            }
            <Drawer title="Add gallery" onClose={() => {
                setAddGalleryDrawerIsOpen(false);
            }} open={addGalleryDrawerIsOpen}>
                <Input id="new-gallery-name" placeholder="name"/>
                <div className="flex justify-end mt-4">
                    <Button onClick={addGallery} icon={<PlusOutlined/>} type="primary">Create</Button>
                </div>
            </Drawer>
        </div>
    );
}
