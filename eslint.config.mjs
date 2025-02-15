import js from "@eslint/js";
import importPlugin from "eslint-plugin-import";
import globals from "globals";
import ts from "typescript-eslint";


export default ts.config(
    js.configs.recommended,
    ...ts.configs.recommended,
    importPlugin.flatConfigs.recommended,
    importPlugin.flatConfigs.typescript,
    {
        languageOptions: {
            ecmaVersion: "latest",
            sourceType: "module",
            globals: {
                ...globals.browser,
                ...globals.node
            }
        }
    },
    {
        files: ["**/*.ts", "**/*.js", "**/*.tsx"],
        languageOptions: {
            parserOptions: {
                parser: ts.parser
            }
        },
        rules: {
            "@typescript-eslint/no-unused-expressions": "off",
            "@typescript-eslint/ban-ts-comment": "off",
            "@typescript-eslint/no-explicit-any": "off",
            "indent": ["error", 4],
            "quotes": ["error", "double"],
            "semi": ["error", "always"],
            "import/no-cycle": "error",
            // https://github.com/import-js/eslint-plugin-import/issues/2765
            "import/no-unresolved": "off",
            "import/no-named-as-default": "off",
            "import/order": [
                "error",
                {
                    groups: ["builtin", "external", "parent", "sibling", "index", "object"],
                    pathGroups: [
                        {
                            pattern: "{react,react-router,react-dom/client,elysia}",
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
        ignores: ["build/", ".svelte-kit/", "dist/", "node_modules/", "**/*.mjs"],
    }
);