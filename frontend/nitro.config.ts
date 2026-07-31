import { defineNitroConfig } from 'nitropack';

export default defineNitroConfig({
  preset: 'node-server',
  output: {
    dir: '.output',
    serverDir: '.output/server',
    publicDir: '.output/public',
  },
  // Ensure standalone Node.js server
  experimental: {
    standalone: true,
  },
  // Configure server to listen on PORT environment variable
  runtimeConfig: {
    nitro: {
      envPrefix: 'PORT_',
    },
  },
});
