import { defineConfig } from "@lovable.dev/vite-tanstack-config";

const backendTarget = process.env.VITE_BACKEND_URL || "http://localhost:5001";

export default defineConfig({
  tanstackStart: {
    server: { entry: "server" },
  },
  vite: {
    server: {
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
  },
});
