import { defineNitroConfig } from 'nitropack';

export default defineNitroConfig({
  preset: 'node-server',
  output: {
    dir: '.output',
    serverDir: '.output/server',
    publicDir: '.output/public',
  },
});
