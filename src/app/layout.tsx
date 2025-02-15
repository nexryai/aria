"use client";

import { useEffect, useState } from "react";

import { UserOutlined } from "@ant-design/icons";
import { Avatar, Button, ConfigProvider } from "antd";
import { Link, Route, Routes } from "react-router";

import { isSignedIn } from "@/browser/auth";

import LoginView from "./login/page";
import TopView from "./page";

import "./globals.css";


export default function RootLayout() {
    const [signedIn, setSignedIn] = useState(false);

    useEffect(() => {
        isSignedIn().then((signedIn) => {
            setSignedIn(signedIn);
        });
    });

    return (
        <ConfigProvider theme={{
            token: {
                fontFamily: "'Outfit', 'Noto Sans JP'",
            }
        }}>
            <div className="fixed top-0 left-0 flex justify-between p-4 w-full bg-white/80 backdrop-blur-xl z-50">
                <div>
                    <Link to="/"><span className="text-xl cursor-pointer">AriaX</span></Link>
                </div>
                <div>
                    {signedIn ? <Avatar icon={<UserOutlined />} /> : <a href="login"><Button>Login</Button></a>}
                </div>
            </div>
            <div className="mt-16">
                <Routes>
                    <Route path="/" element={<TopView />} />
                    <Route path={"/login"} element={<LoginView />} />
                </Routes>
            </div>
        </ConfigProvider>
    );
}
