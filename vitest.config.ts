import { defineConfig } from "vitest/config";

export default defineConfig({
    test: {
        // Playwrightと競合する
        exclude: ["test/**/*.spec.ts"],
        sequence: {
            shuffle: false,
            concurrent: false,
        },
    },
});
