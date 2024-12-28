import type { NextConfig } from "next";

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
};

export default nextConfig;
