import { resolve } from 'path';
import { defineConfig } from 'vite';
import { createHtmlPlugin } from 'vite-plugin-html';

export default defineConfig({
  base: '/tangible-workshop-interface/',
  plugins: [
    createHtmlPlugin({
      minify: true,
      pages: [
        {
          filename: 'controller.html',
          template: 'controller.html',
          injectOptions: {
            ejsOptions: {
              filename: resolve(__dirname, 'controller.html'),
            },
          },
        },
        {
          filename: 'display.html',
          template: 'display.html',
          injectOptions: {
            ejsOptions: {
              filename: resolve(__dirname, 'display.html'),
            },
          },
        },
      ],
    }),
  ],
  build: {
    rollupOptions: {
      input: {
        controller: resolve(__dirname, 'controller.html'),
        display: resolve(__dirname, 'display.html'),
      },
    },
  },
});
