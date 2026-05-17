import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Dev: the React app runs on 5173 and proxies /api calls to the server on 4000.
// Prod: the server serves the built files itself, so no proxy is needed.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      "/api": "http://localhost:4000",
    },
  },
});
