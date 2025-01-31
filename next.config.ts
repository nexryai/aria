import type { NextConfig } from "next";

const apiServer = process.env.API_SERVER;

const nextConfig: NextConfig = {
    /* config options here */
    output: "standalone",
    outputFileTracingIncludes: {
        "/api/\\[\\[\\.\\.\\.slugs\\]\\]": [
            "./node_modules/elysia/dist/**/*",
        ],
        "/auth/\\[\\[\\.\\.\\.slugs\\]\\]": [
            "./node_modules/elysia/dist/**/*",
        ],
    },
    rewrites: async () => {
        return [
            {
                source: "/api/:path*",
                destination: `${apiServer}/api/:path*`,
            },
            // /auth/... へのリクエストをプロキシ
            {
                source: "/auth/:path*",
                destination: `${apiServer}/auth/:path*`,
            },
        ];
    }
};

export default nextConfig;
