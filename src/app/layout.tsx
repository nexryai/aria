import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Button, ConfigProvider } from "antd";
import Link from "next/link";

const geistSans = Geist({
    variable: "--font-geist-sans",
    subsets: ["latin"],
});

const geistMono = Geist_Mono({
    variable: "--font-geist-mono",
    subsets: ["latin"],
});

export const metadata: Metadata = {
    title: "Create Next App",
    description: "Generated by create next app",
};

export default function RootLayout({children,}: Readonly<{
    children: React.ReactNode;
}>) {
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
            className={`${geistSans.variable} ${geistMono.variable} antialiased`}
        >
            <ConfigProvider theme={{
                token: {
                    fontFamily: "'Outfit', 'Noto Sans JP'",
                }
            }}>
                <div className="fixed top-0 left-0 flex justify-between p-4 w-full bg-white">
                    <div>
                        <Link href="/"><span className="text-xl cursor-pointer">AriaX</span></Link>
                    </div>
                    <div>
                        <Link href="login"><Button>Login</Button></Link>
                    </div>
                </div>
                {children}
            </ConfigProvider>
        </body>
        </html>
    );
}
