import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import { fileURLToPath, URL } from "node:url";


// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    proxy: {
      "/files": {
        target: "http://localhost:3000",
        changeOrigin: true
        // rewrite: path => path.replace(/^\/files/, '')
      }, "/file_link": {
        target: "http://localhost:3000",
        changeOrigin: true
        // rewrite: path => path.replace(/^\/files/, '')
      }

    }
  },
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url))
    }
  }
});
