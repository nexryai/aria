"use client";
import { useEffect, useState } from "react";

import { Button } from "antd";

import { app } from "@/browser/api";

export default function Page({params,}: {
    params: Promise<{ id: string }>
}) {
    const [text, setText] = useState("");
    const fetchGallery = async (offset: number = 0) => {
        const id = (await params).id;
        const { data } = await app.api.gallery({id}).get({query: {offset}});
        setText(JSON.stringify(data));
    };

    useEffect(() => {
        fetchGallery();
    });

    return (
        <>
            <div>My Post: {text}</div>
            <Button type="primary">Upload</Button>
        </>
    );
}
