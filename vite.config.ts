import { execSync } from "node:child_process";
import { defineConfig, type Plugin, type UserConfig } from "vite";
import dts from "unplugin-dts/vite";
import { createHtmlPlugin } from "vite-plugin-html";

/** Public origin the site is deployed to (used by the sitemap). */
const SITE_URL = "https://simple-whiteboard.ludovicm67.fr";

/** The pages listed in the sitemap (the 404 page is deliberately excluded). */
const SITE_PAGES = [
  { path: "/", file: "index.html", priority: "1.0" },
  { path: "/app.html", file: "app.html", priority: "0.8" },
  { path: "/api.html", file: "api.html", priority: "0.8" },
];

/**
 * Last modification date (`YYYY-MM-DD`) of a file, taken from git so `lastmod`
 * reflects real content changes rather than the moment we happened to build.
 * Falls back to the build date when git history is unavailable (shallow clone,
 * source tarball, …).
 */
function lastModified(file: string): string {
  try {
    const out = execSync(`git log -1 --format=%cI -- ${file}`, {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
    if (out) {
      return out.slice(0, 10);
    }
  } catch {
    // No git available — fall through to the build date.
  }
  return new Date().toISOString().slice(0, 10);
}

function buildSitemap(): string {
  const urls = SITE_PAGES.map(
    (page) => `  <url>
    <loc>${SITE_URL}${page.path}</loc>
    <lastmod>${lastModified(page.file)}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>${page.priority}</priority>
  </url>`
  ).join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>
`;
}

/**
 * Emits `sitemap.xml` with build-time dates, and serves the same content from
 * the dev server so it can be checked locally (and by the e2e tests).
 *
 * @param emit Whether to write the file into the build output.
 */
function sitemap(emit: boolean): Plugin {
  return {
    name: "simple-whiteboard:sitemap",
    configureServer(server) {
      server.middlewares.use("/sitemap.xml", (_req, res) => {
        res.setHeader("Content-Type", "application/xml");
        res.end(buildSitemap());
      });
    },
    generateBundle() {
      if (!emit) {
        return;
      }
      this.emitFile({
        type: "asset",
        fileName: "sitemap.xml",
        source: buildSitemap(),
      });
    },
  };
}

export default defineConfig(({ mode, command }): UserConfig => {
  // Site build (`vite build --mode site`): the marketing pages — landing
  // (index.html), the whiteboard demo (app.html), the API reference (api.html)
  // and the 404 page. It is deliberately kept separate from the library build
  // and written to its own `dist-site/` folder, so the published package
  // (`dist/`) only ever contains the library, never the HTML.
  if (mode === "site") {
    return {
      plugins: [
        createHtmlPlugin({
          minify: true,
        }),
        sitemap(true),
      ],
      build: {
        outDir: "dist-site",
        emptyOutDir: true,
        rollupOptions: {
          input: {
            landing: "./index.html",
            app: "./app.html",
            api: "./api.html",
            notFound: "./404.html",
          },
        },
      },
    };
  }

  // Library build (the default, used by `npm run build`): this is what gets
  // published to npm. It only emits the library entry, its chunks, the
  // extracted CSS and the TypeScript declarations — no HTML.
  return {
    // `public/` holds site-only assets (favicons, robots.txt). They must not be
    // copied into the published package, but the dev server (which uses this
    // same branch) still needs to serve them.
    publicDir: command === "build" ? false : "public",
    plugins: [
      dts({
        insertTypesEntry: true,
      }),
      // Dev-server only: keeps `/sitemap.xml` available while developing.
      sitemap(false),
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
