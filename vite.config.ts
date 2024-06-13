import { defineConfig } from "vite";
import dts from "vite-plugin-dts";
import { createHtmlPlugin } from "vite-plugin-html";

export default defineConfig({
  plugins: [
    dts({
      insertTypesEntry: true,
    }),
    createHtmlPlugin({
      minify: true,
    }),
  ],
  build: {
    sourcemap: true,
    rollupOptions: {
      input: {
        index: "./src/index.ts",
        html: "./index.html",
      },
      output: {
        entryFileNames: "[name].js",
        chunkFileNames: "[name].js",
        assetFileNames: "[name].[ext]",
      },
    },
  },
});
