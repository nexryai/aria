const eslintConfig = [
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
                            pattern: "{next,next/**,react,elysia}",
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
