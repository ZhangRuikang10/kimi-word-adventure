import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const localAcceptance = process.env.LOCAL_ACCEPTANCE === "true";

export default defineConfig({
  plugins: [react()],
  base: localAcceptance ? "./" : process.env.GITHUB_PAGES ? "/kimi-word-adventure/" : "/",
  build: localAcceptance ? { outDir: "play-now", emptyOutDir: true } : undefined,
});
