import { defineConfig } from "vite";
import dts from "unplugin-dts/vite";
import { createHtmlPlugin } from "vite-plugin-html";

export default defineConfig(({ mode }) => {
  return {
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
      lib: {
        entry: "src/simple-whiteboard.ts",
        formats: ["es"],
      },
      rollupOptions: {
        external: mode === "production" ? "" : /^lit-element/,
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
  };
});
