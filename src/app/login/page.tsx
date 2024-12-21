import { Button } from "antd";
import { UserOutlined } from "@ant-design/icons";

export default function Page() {
    return (
        <div className="w-full">
            <div className="mt-52 mx-auto w-[600px] bg-gray-50 rounded-lg overflow-hidden">
                <div className="relative h-12 p-2">
                    <span className="relative z-10 text-2xl text-white">Welcome back</span>
                    <img
                        className="absolute top-0 left-0 h-12 w-full object-cover -z-0"
                        src="https://images.unsplash.com/photo-1655635643617-72e0b62b9278?q=80&w=2832&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D"
                    />
                </div>
                <p className="m-6">Please sign in to continue</p>
                <div className="mt-28 text-right">
                    <div className="m-4">
                        <Button icon={<UserOutlined />} type="primary" size="large">Sign in with Passkey</Button>
                    </div>
                </div>

            </div>
        </div>
    )
}

