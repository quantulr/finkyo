import { defineConfig } from "vite";
import solid from "@solidjs/vite-plugin";

export default defineConfig({
  plugins: [solid()],
  server: {
    port: 3030,
    proxy: {
      "/api": "http://localhost:3000",
      "/healthz": "http://localhost:3000",
    },
  },
  build: {
    target: "esnext",
    assetsInlineLimit: 0,
  },
});
