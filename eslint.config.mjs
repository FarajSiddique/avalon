import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

/**
 * Import boundaries. They keep server-only game state out of the browser
 * bundle. See "App structure" in docs/architecture.md.
 */
const noServerImports = {
  patterns: [
    {
      group: [
        "@/server",
        "@/server/*",
        "**/server/rooms/*",
        "**/server/realtime/*",
      ],
      message:
        "Browser and Next.js code must not import server state. Talk to the server through @/shared/protocol.",
    },
  ],
};

const sharedIsPure = {
  patterns: [
    {
      group: [
        "@/server/*",
        "@/client/*",
        "@/app/*",
        "@/design/*",
        "next",
        "next/*",
        "react",
        "react-dom",
        "node:*",
        "socket.io",
        "socket.io-client",
      ],
      message:
        "src/shared is plain TypeScript used by both sides. It may only import zod and other src/shared files.",
    },
  ],
};

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      "@typescript-eslint/no-explicit-any": "error",
    },
  },
  {
    files: ["src/app/**", "src/client/**", "src/design/**"],
    rules: { "no-restricted-imports": ["error", noServerImports] },
  },
  {
    files: ["src/shared/**"],
    rules: { "no-restricted-imports": ["error", sharedIsPure] },
  },
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "dist/**",
    "next-env.d.ts",
    "playwright-report/**",
    "test-results/**",
  ]),
]);

export default eslintConfig;
