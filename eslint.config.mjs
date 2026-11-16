import js from "@eslint/js";
import { defineConfig, globalIgnores } from "eslint/config";
import reactHooks from "eslint-plugin-react-hooks";
import globals from "globals";
import tseslint from "typescript-eslint";

/**
 * Import boundaries. They keep room state and validators out of the browser
 * bundle and keep shared code free of platform dependencies. See "App
 * structure" in docs/architecture.md.
 */
const noServerImports = {
  patterns: [
    {
      group: ["@/server", "@/server/*", "**/server/room/*", "cloudflare:*"],
      message:
        "Browser code must not import server code. Talk to the room through @/client and @/shared/protocol, or call a server function in @/functions.",
    },
  ],
};

const sharedIsPure = {
  patterns: [
    {
      group: [
        "@/server/*",
        "@/client/*",
        "@/components/*",
        "@/functions/*",
        "@/routes/*",
        "@/design/*",
        "@tanstack/*",
        "react",
        "react-dom",
        "node:*",
        "cloudflare:*",
      ],
      message:
        "src/shared is plain TypeScript used by both sides. It may only import zod and other src/shared files.",
    },
  ],
};

export default defineConfig([
  globalIgnores([
    "dist/**",
    ".wrangler/**",
    ".tanstack/**",
    "src/routeTree.gen.ts",
    "worker-configuration.d.ts",
    "playwright-report/**",
    "test-results/**",
  ]),
  js.configs.recommended,
  tseslint.configs.recommended,
  reactHooks.configs.flat.recommended,
  {
    languageOptions: { globals: { ...globals.browser, ...globals.node } },
    rules: {
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/consistent-type-imports": [
        "error",
        { fixStyle: "inline-type-imports" },
      ],
    },
  },
  {
    files: [
      "src/routes/**",
      "src/components/**",
      "src/client/**",
      "src/design/**",
    ],
    ignores: ["src/routes/api/**"],
    rules: { "no-restricted-imports": ["error", noServerImports] },
  },
  {
    files: ["src/shared/**"],
    rules: { "no-restricted-imports": ["error", sharedIsPure] },
  },
]);
