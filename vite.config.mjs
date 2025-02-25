import { resolve } from "node:path";

import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
    plugins: [
        tailwindcss(),
        react(),
    ],
    resolve: {
        alias: [{ find: "@", replacement: resolve(__dirname, "./src") }]
    },
    server: {
        proxy: {
            "/api": {
                target: "http://localhost:4000",
                changeOrigin: true,
                secure: false,
            },
            "/auth": {
                target: "http://localhost:4000",
                changeOrigin: true,
                secure: false,
            },
        },
    },
});