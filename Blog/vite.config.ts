import path from "path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const __dirname = import.meta.dirname;

export default defineConfig({
  base: "/blog/",
  plugins: [react()],
  server: {
    port: 3000,
    cors: {
      origin: [
        'http://localhost:8080',
        'http://localhost:5173',
        'http://127.0.0.1:8080',
        'http://127.0.0.1:5173',
      ],
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    outDir: path.resolve(__dirname, "dist"),
    emptyOutDir: true,
  },
});
