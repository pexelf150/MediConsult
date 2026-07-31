import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import tailwindcss from "@tailwindcss/vite";

const backendTarget =
  process.env.VITE_BACKEND_URL || "http://localhost:5001";

export default defineConfig({
  plugins: [
    tanstackStart({
      tsr: {
        // TanStack Router configuration
      },
      react: {
        // React configuration
      },
      nitro: {
        // Nitro configuration for Node server
        preset: 'node-server',
      },
    }),
    react(),
    tailwindcss(),
  ],

  ssr: {
    noExternal: ["@tanstack/react-start"],
  },

  server: {
    port: 3000,
    proxy: {
      "/api": {
        target: backendTarget,
        changeOrigin: true,
      },

      "/socket.io": {
        target: backendTarget,
        changeOrigin: true,
        ws: true,
      },
    },
  },
});