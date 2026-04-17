import { resolve } from 'path';
import { defineConfig } from 'vite';

export default defineConfig(({ command }) => ({
  base: command === 'serve' ? '/' : '/tangible-workshop-interface/',
  build: {
    rollupOptions: {
      input: {
        display: resolve(__dirname, 'display.html'),
        controller: resolve(__dirname, 'controller.html'),
      },
    },
  },
}));
