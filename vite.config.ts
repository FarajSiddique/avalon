import { cloudflare } from "@cloudflare/vite-plugin";
import tailwindcss from "@tailwindcss/vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  resolve: { tsconfigPaths: true },
  // Phones from the last few years. Keeps modern syntax (for example Unicode
  // property escapes in regular expressions) from being expanded.
  build: { target: "es2022" },
  plugins: [
    // Runs the Worker (and its Durable Objects) in Cloudflare's local runtime.
    cloudflare({ viteEnvironment: { name: "ssr" } }),
    tailwindcss(),
    tanstackStart(),
    viteReact(),
  ],
});
