import cloudflare from "@cloudflare/oxlint-config";
import { defineConfig } from "oxlint";

/**
 * Effects are banned. Subscribe through useSyncExternalStore (or a zustand
 * store), clean up DOM work in a React 19 ref callback, and react to user
 * input in event handlers. See "Effects" in docs/architecture.md.
 */
const effectHooks = ["useEffect", "useLayoutEffect", "useInsertionEffect"];

const noEffectsMessage =
  "Effects are banned. Use useSyncExternalStore or a zustand store for subscriptions, a ref callback with cleanup for DOM work, or an event handler.";

// Temporary during the migration: the ban switches on once every effect is gone.
const banEffects = false;

const noEffects = banEffects
  ? [{ name: "react", importNames: effectHooks, message: noEffectsMessage }]
  : [];

/** Catches `React.useEffect` when React is imported as a namespace. */
const noEffectProperties = (banEffects ? effectHooks : []).map((property) => ({
  object: "React",
  property,
  message: noEffectsMessage,
}));

const noMathRandom = {
  object: "Math",
  property: "random",
  message:
    "Game and room logic take randomness from the injected Rng or from crypto, never Math.random.",
};

/**
 * Import boundaries. They keep room state and validators out of the browser
 * bundle and keep shared code free of platform dependencies. See "App
 * structure" in docs/architecture.md.
 */
const noServerImports = [
  {
    group: ["@/server", "@/server/*", "**/server/room/*", "cloudflare:*"],
    message:
      "Browser code must not import server code. Talk to the room through @/client and @/shared/protocol, or call a server function in @/functions.",
  },
];

const sharedIsPure = [
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
];

/** Temporary during the migration. Each later commit removes entries. */
const migrationOff = {
  "@stylistic/padding-line-between-statements": "off",
  "@stylistic/lines-between-class-members": "off",
  "@nkzw/no-instanceof": "off",
  curly: "off",
  "no-console": "off",
  "no-promise-executor-return": "off",
  "quality/no-chained-type-assertions": "off",
  "quality/no-known-value-widening": "off",
  "quality/no-unknown-returns": "off",
  "quality/no-unsafe-dictionary-type": "off",
  "typescript/array-type": "off",
  "typescript/no-misused-promises": "off",
  "typescript/no-non-null-assertion": "off",
  "typescript/no-unnecessary-type-assertion": "off",
  "typescript/no-unsafe-type-assertion": "off",
  "typescript/only-throw-error": "off",
  "typescript/unbound-method": "off",
  "unicorn/consistent-function-scoping": "off",
  "unicorn/no-array-fill-with-reference-type": "off",
  "unicorn/numeric-separators-style": "off",
  "unicorn/prefer-dom-node-append": "off",
  "unicorn/prefer-single-call": "off",
  "unicorn/prefer-string-replace-all": "off",
  "unicorn/prefer-structured-clone": "off",
  "unicorn/text-encoding-identifier-case": "off",
} as const;

export default defineConfig({
  ...cloudflare,
  jsPlugins: [
    ...(cloudflare.jsPlugins ?? []),
    { name: "@stylistic", specifier: "@stylistic/eslint-plugin" },
  ],
  ignorePatterns: [
    ...(cloudflare.ignorePatterns ?? []),
    "dist/**",
    ".wrangler/**",
    ".tanstack/**",
    "src/routeTree.gen.ts",
    "worker-configuration.d.ts",
    "playwright-report/**",
    "test-results/**",
  ],
  rules: {
    ...cloudflare.rules,

    "typescript/no-explicit-any": "error",
    "typescript/consistent-type-imports": [
      "error",
      { fixStyle: "inline-type-imports" },
    ],
    // The repo keeps type-only imports inline (`import { a, type B }`). The
    // preset's prefer-top-level style would fight that autofix.
    "import/consistent-type-specifier-style": "off",

    "no-restricted-imports": ["error", { paths: noEffects }],
    "no-restricted-properties": ["error", ...noEffectProperties],

    // Prettier keeps blank lines but never adds them. These do.
    "@stylistic/padding-line-between-statements": [
      "error",
      { blankLine: "always", prev: "*", next: "return" },
      { blankLine: "always", prev: ["const", "let"], next: "*" },
      { blankLine: "any", prev: ["const", "let"], next: ["const", "let"] },
      {
        blankLine: "always",
        prev: "*",
        next: ["multiline-block-like", "function", "class"],
      },
      {
        blankLine: "always",
        prev: ["multiline-block-like", "function", "class"],
        next: "*",
      },
    ],
    "@stylistic/lines-between-class-members": [
      "error",
      "always",
      { exceptAfterSingleLine: true },
    ],

    ...migrationOff,
  },
  overrides: [
    ...(cloudflare.overrides ?? []),
    {
      files: [
        "src/routes/**",
        "src/components/**",
        "src/client/**",
        "src/design/**",
      ],
      rules: {
        "no-restricted-imports": [
          "error",
          { paths: noEffects, patterns: noServerImports },
        ],
      },
    },
    {
      // Server routes run in the Worker, so they may import server code.
      files: ["src/routes/api/**"],
      rules: { "no-restricted-imports": ["error", { paths: noEffects }] },
    },
    {
      files: ["src/server/**", "src/shared/**"],
      rules: {
        "no-restricted-properties": [
          "error",
          ...noEffectProperties,
          noMathRandom,
        ],
      },
    },
    {
      files: ["src/shared/**"],
      rules: {
        "no-restricted-imports": [
          "error",
          { paths: noEffects, patterns: sharedIsPure },
        ],
      },
    },
    {
      // TanStack Router stops a load by throwing redirect() or notFound(),
      // which are not Error objects by design.
      files: ["src/routes/**"],
      rules: { "typescript/only-throw-error": "off" },
    },
    {
      // The preset relaxes `any` in tests. This repo bans it everywhere.
      files: ["**/*.{test,spec,e2e,shots}.{ts,tsx}", "e2e/**"],
      rules: { "typescript/no-explicit-any": "error" },
    },
    {
      // Scripts and browser tests report progress on the console.
      files: ["scripts/**", "e2e/**", "*.config.ts", "*.config.mts"],
      rules: { "no-console": "off" },
    },
  ],
});
