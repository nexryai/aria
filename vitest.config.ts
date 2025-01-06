import { defineConfig } from "vitest/config";

export default defineConfig({
    test: {
        // Playwrightと競合する
        exclude: [
            "**/node_modules/**",
            "**/tests/*.spec.ts",
        ],
        sequence: {
            shuffle: false,
            concurrent: false,
        },
    },
});
