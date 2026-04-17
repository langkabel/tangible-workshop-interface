import { resolve } from 'path';
import { defineConfig } from 'vite';

export default defineConfig(({ command }) => ({
  base: command === 'serve' ? '/' : '/tangible-workshop-interface/',
  build: {
    rollupOptions: {
      input: {
        index: resolve(__dirname, 'index.html'),
        controller: resolve(__dirname, 'controller.html'),
      },
    },
  },
}));
