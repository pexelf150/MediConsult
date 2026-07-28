import { defineConfig } from "@lovable.dev/vite-tanstack-config";

const backendTarget = process.env.VITE_BACKEND_URL || "http://localhost:5001";

export default defineConfig({
  tanstackStart: {
    server: { entry: "server" },
    nitro: {
      preset: "node-server",
      output: {
        dir: ".output",
        serverDir: ".output/server",
        publicDir: ".output/public",
      },
      routeRules: {
        "/api/**": { proxy: { to: backendTarget } },
        "/socket.io/**": { proxy: { to: backendTarget, websocket: true } },
      },
    },
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
