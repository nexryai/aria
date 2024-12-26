"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { UserOutlined } from "@ant-design/icons";
import { Avatar, Button, ConfigProvider } from "antd";

import { isSignedIn } from "@/browser/auth";

import "./globals.css";


export default function RootLayout({children,}: Readonly<{
    children: React.ReactNode;
}>) {
    const [signedIn, setSignedIn] = useState(false);

    useEffect(() => {
        isSignedIn().then((signedIn) => {
            setSignedIn(signedIn);
        });
    });

    return (
        <html lang="en">
            <head>
                <link rel="preconnect" href="https://fonts.googleapis.com"/>
                <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous"/>
                <link rel="preload" as="style" fetchPriority="high"
                    href="https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@300..500&family=Outfit:wght@300..500&display=swap"/>
                <link rel="stylesheet"
                    href="https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@300..500&family=Outfit:wght@300..500&display=swap"/>
            </head>
            <body
                className={`antialiased`}
            >
                <ConfigProvider theme={{
                    token: {
                        fontFamily: "'Outfit', 'Noto Sans JP'",
                    }
                }}>
                    <div className="fixed top-0 left-0 flex justify-between p-4 w-full bg-white bg-opacity-80 backdrop-blur-xl z-50">
                        <div>
                            <Link href="/"><span className="text-xl cursor-pointer">AriaX</span></Link>
                        </div>
                        <div>
                            {signedIn ? <Avatar icon={<UserOutlined />} /> : <Link href="login"><Button>Login</Button></Link>}
                        </div>
                    </div>
                    <div className="mt-16">{children}</div>
                </ConfigProvider>
            </body>
        </html>
    );
}
