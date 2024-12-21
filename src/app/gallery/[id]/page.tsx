'use client';
import { app } from "@/browser/api";
import { Dispatch, SetStateAction, useState } from "react";
import { Button } from "antd";

const render = async (params: Promise<{ id: string }>, setText: Dispatch<SetStateAction<string>>) => {
    const id = (await params).id
    const { data } = await app.api.gallery({id}).get()
    setText(data as string)
}

export default function Page({params,}: {
    params: Promise<{ id: string }>
}) {
    const [text, setText] = useState('')
    render(params, setText).catch(console.error)

    const reload = () => render(params, setText)
    return (
        <>
            <div>My Post: {text}</div>
            <Button type="primary" onClick={reload}>Reload</Button>
        </>
    )
}
