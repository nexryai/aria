'use client';

import { Button, message } from "antd";
import { UserOutlined } from "@ant-design/icons";
import { startRegistration } from "@simplewebauthn/browser";
import { signIn } from "@/browser/auth";

export default function Page() {
    const [messageApi, contextHolder] = message.useMessage();

    const successMessage = (message: string) => {
        messageApi.open({
            type: 'success',
            content: message,
        });
    };

    const errorMessage = (message: string) => {
        messageApi.open({
            type: 'error',
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
        <div className="w-full">
            <div className="mt-52 mx-auto w-[600px]  rounded-lg overflow-hidden border-neutral-100 border">
                <div className="relative h-12 p-2">
                    <span className="relative z-10 text-2xl text-white">Welcome back</span>
                    <img
                        className="absolute top-0 left-0 h-12 w-full object-cover -z-0"
                        src="https://images.unsplash.com/photo-1655635643617-72e0b62b9278?q=80&w=2832&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D"
                    />
                </div>
                <p className="m-6">Please sign in to continue</p>
                <div className="mt-28 text-right">
                    <div className="m-4 flex justify-end">
                        <Button className="mr-2" size="large" onClick={register}>Register</Button>
                        <Button
                            icon={<UserOutlined />}
                            type="primary"
                            onClick={() => {signIn().then(() => {successMessage("Signed in!")})}}
                            size="large"
                        >
                            Sign in with Passkey
                        </Button>
                    </div>
                </div>

            </div>
        </div>
        </>
    )
}

