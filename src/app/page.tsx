"use client";
import Image from "next/image";
import { isSignedIn } from "@/browser/auth";
import { useState } from "react";
import { isBrowser } from "@/env";
import { Button, Drawer, Input } from "antd";
import { PlusOutlined } from "@ant-design/icons";
import { app } from "@/browser/api";

export default function Home() {
    const [signedIn, setSignedIn] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [addGalleryDrawerIsOpen, setAddGalleryDrawerIsOpen] = useState(false);

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

    isBrowser && isSignedIn().then((signedIn) => {
        setSignedIn(signedIn);
        setIsLoading(false);
    });

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
                <div className="flex justify-between">
                    <span className="text-xl">Gallery</span>
                    <Button icon={<PlusOutlined />} onClick={() => setAddGalleryDrawerIsOpen(true)} type="default">Add</Button>
                </div>
            }
            <Drawer title="Add gallery" onClose={() => {setAddGalleryDrawerIsOpen(false);}} open={addGalleryDrawerIsOpen}>
                <Input id="new-gallery-name" placeholder="name"/>
                <div className="flex justify-end mt-4">
                    <Button onClick={addGallery} icon={<PlusOutlined />} type="primary">Create</Button>
                </div>
            </Drawer>
        </div>
    );
}
