import { defineConfig } from "@playwright/test";

/**
 * End-to-end tests for the whiteboard, run against the Vite dev server.
 *
 * The suite exercises the built component through real browser interaction
 * (clicking the toolbar, dragging on the canvas, keyboard shortcuts, the menu,
 * exports and cross-tab sync) plus the marketing/site pages. The goal is a
 * safety net: a regression in any user-facing feature should fail here.
 */
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? "line" : "list",
  use: {
    baseURL: "http://localhost:5173",
    trace: "on-first-retry",
    viewport: { width: 1280, height: 800 },
  },
  projects: [{ name: "chromium", use: { browserName: "chromium" } }],
  webServer: {
    command: "npm run dev",
    url: "http://localhost:5173/app.html",
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
});
