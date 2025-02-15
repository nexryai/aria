"use client";

import { UserOutlined, LoginOutlined } from "@ant-design/icons";
import { startRegistration } from "@simplewebauthn/browser";
import { Button, message } from "antd";

import { signIn } from "@/browser/auth";

export default function Page() {
    const [messageApi, contextHolder] = message.useMessage();

    const successMessage = (message: string) => {
        messageApi.open({
            type: "success",
            content: message,
        });
    };

    const errorMessage = (message: string) => {
        messageApi.open({
            type: "error",
            content: message,
        });
    };

    const register = async() => {
        const resp = await fetch("/auth/register-request", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ displayName: "New User" })
        });

        const passkeyOptions = await resp.json();
        let attResp;
        try {
            // Pass the options to the authenticator and wait for a response
            attResp = await startRegistration({ optionsJSON: passkeyOptions });
        } catch (error) {
            errorMessage("Failed to sign up");
            console.error(error);
            throw error;
        }

        fetch("/auth/verify-registration", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(attResp),
        }).then((response) => {
            if (!response.ok) {
                errorMessage("Failed to sign up");
            } else {
                successMessage("Successfully signed up");
            }
        });
    };

    return (
        <>
            {contextHolder}
            <div className="absolute top-0 left-0 w-screen h-screen">
                <img className="absolute top-0 left-0 h-full w-full object-cover -z-0" src="https://images.unsplash.com/photo-1655635643617-72e0b62b9278?q=80&w=2832&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D" />
            </div>
            <div className="w-full relative">
                <div className="mt-52 sm:mx-auto mx-4 sm:w-[600px]  rounded-lg overflow-hidden border-neutral-100 border bg-white bg-opacity-70 backdrop-blur-lg">
                    <div className="relative h-12 p-2 bg-white bg-opacity-50">
                        <span className="relative z-10 text-2xl text-black">Welcome back</span>
                    </div>
                    <div className="flex mt-16 justify-center">
                        <div className="flex justify-center bg-gray-200 rounded-full w-16 h-16">
                            <UserOutlined className="w-10 h-10 mt-2.5" style={{ fontSize: '40px', color: '#08c' }} />
                        </div>

                    </div>
                    <div className="mt-16 text-right">
                        <div className="m-4 flex justify-center flex-wrap">
                            <Button id="ariax-sign-up" className="mr-2 mb-2" shape="round" size="large" onClick={register}>Register</Button>
                            <Button
                                id="ariax-passkey-sign-in"
                                icon={<LoginOutlined />}
                                className="mb-2"
                                type="primary"
                                shape="round"
                                onClick={() => {signIn().then(() => {
                                    successMessage("Signed in!");
                                    window.location.href = "/";
                                });}}
                                size="large"
                            >
                            Sign in with Passkey
                            </Button>
                        </div>
                    </div>

                </div>
            </div>
        </>
    );
}

