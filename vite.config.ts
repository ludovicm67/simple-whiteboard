import { defineConfig, type UserConfig } from "vite";
import dts from "unplugin-dts/vite";
import { createHtmlPlugin } from "vite-plugin-html";

export default defineConfig(({ mode }): UserConfig => {
  // Site build (`vite build --mode site`): the marketing pages — landing
  // (index.html), the whiteboard demo (app.html) and the API reference
  // (api.html). It is deliberately kept separate from the library build and
  // written to its own `dist-site/` folder, so the published package (`dist/`)
  // only ever contains the library, never the HTML.
  if (mode === "site") {
    return {
      plugins: [
        createHtmlPlugin({
          minify: true,
        }),
      ],
      build: {
        outDir: "dist-site",
        emptyOutDir: true,
        rollupOptions: {
          input: {
            landing: "./index.html",
            app: "./app.html",
            api: "./api.html",
          },
        },
      },
    };
  }

  // Library build (the default, used by `npm run build`): this is what gets
  // published to npm. It only emits the library entry, its chunks, the
  // extracted CSS and the TypeScript declarations — no HTML.
  return {
    plugins: [
      dts({
        insertTypesEntry: true,
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
