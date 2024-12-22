import { dirname } from "path";
import { fileURLToPath } from "url";

import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
    baseDirectory: __dirname,
});

const eslintConfig = [
    ...compat.extends("next/core-web-vitals", "next/typescript"),
    {
        rules: {
            "@typescript-eslint/no-unused-expressions": ["off"],
            "indent": ["error", 4],
            "quotes": ["error", "double"],
            "semi": ["error", "always"],
            "import/no-cycle": "error",
            "import/order": [
                "error",
                {
                    groups: ["builtin", "external", "parent", "sibling", "index", "object"],
                    pathGroups: [
                        {
                            pattern: "{next,next/**,react,Elysia}",
                            group: "builtin",
                            position: "before",
                        },
                        {
                            pattern: "{@/**,$lib/**,@prisma/client}",
                            group: "parent",
                            position: "before",
                        },
                    ],
                    pathGroupsExcludedImportTypes: ["type"],
                    alphabetize: {
                        order: "asc",
                    },
                    "newlines-between": "always",
                },
            ],
        }
    },
    {
        ignores: ["src/wasm/pkg/*", ".next/*", "node_modules/*"],
    }
];

export default eslintConfig;
