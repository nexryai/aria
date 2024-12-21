'use client';
import Image from "next/image";
import { isSignedIn } from "@/browser/auth";
import { useState } from "react";

export default function Home() {
    const [signedIn, setSignedIn] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    isSignedIn().then((signedIn) => {
        setSignedIn(signedIn);
        setIsLoading(false);
    })

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
                <p>todo</p>
            }
        </div>
    );
}
