// =============================================
// FILE: vite.config.js — Vite development server settings
// =============================================
// Vite is what runs our React app in the browser
// during development. This file tells Vite how
// to behave.

import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  // Use the React plugin (lets us write .jsx files)
  plugins: [react()],

  server: {
    port: 3000,
    proxy: {
      "/api": "http://localhost:8000",
      "/uploads": "http://localhost:8000",
      "/socket.io": {
        target: "http://localhost:8000",
        ws: true,
      },
    },
  },
});
