import { defineConfig } from "vite";
import solidPlugin from "vite-plugin-solid";
import tailwindcss from "@tailwindcss/vite";
import { fileURLToPath, URL } from "node:url";

export default defineConfig({
  plugins: [solidPlugin(), tailwindcss()],
  server: {
    port: 3030,
    host: true,
    proxy: {
      "/files": {
        target: "http://192.168.1.200:3030",
        changeOrigin: true,
        // rewrite: path => path.replace(/^\/files/, '')
      },
      "/file_link": {
        target: "http://192.168.1.200:3030",
        changeOrigin: true,
        // rewrite: path => path.replace(/^\/files/, '')
      },
    },
  },
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  build: {
    target: "esnext",
  },
});
