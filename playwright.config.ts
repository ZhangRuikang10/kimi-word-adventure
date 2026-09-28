import { defineConfig } from "@playwright/test";
// A dedicated port prevents the Word Adventure smoke suite from attaching to
// the adjacent English Adventure dev server.
export default defineConfig({ testDir:"./tests/e2e", use:{ baseURL:"http://127.0.0.1:4174" }, webServer:{ command:"pnpm vite --host 127.0.0.1 --port 4174", url:"http://127.0.0.1:4174", reuseExistingServer:false } });
