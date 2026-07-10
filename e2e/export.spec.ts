import { test } from "@playwright/test";
import { readFileSync } from "node:fs";
import { openApp, drawShape, worldToClient, expect } from "./helpers";
import type { Download, Page } from "@playwright/test";

/** Open the menu and click an Export submenu entry by its (partial) label. */
async function openExport(page: Page, label: string): Promise<void> {
  const menu = page.locator("simple-whiteboard-menu");
  await menu.locator(".menu-button").click();
  await menu.locator(".menu-item", { hasText: "Export" }).first().hover();
  await menu.locator(".submenu-item", { hasText: label }).click();
}

/** Assert a captured download is a PNG with the expected filename prefix. */
async function expectPng(download: Download, prefix: RegExp): Promise<void> {
  expect(download.suggestedFilename()).toMatch(prefix);
  const path = await download.path();
  const bytes = readFileSync(path);
  // PNG magic number: 89 50 4E 47.
  expect([bytes[0], bytes[1], bytes[2], bytes[3]]).toEqual([0x89, 0x50, 0x4e, 0x47]);
  expect(bytes.length).toBeGreaterThan(100);
}

test.beforeEach(async ({ page }) => {
  await openApp(page);
  await drawShape(page, "rect", -200, -80, -60, 30, { strokeWidth: 3 });
  await drawShape(page, "arrow", 40, 100, 220, -20, { strokeWidth: 3 });
});

test("exports the current view as a PNG", async ({ page }) => {
  const [download] = await Promise.all([
    page.waitForEvent("download"),
    openExport(page, "Current view"),
  ]);
  await expectPng(download, /^whiteboard-\d.*\.png$/);
});

test("exports the full view as a PNG", async ({ page }) => {
  const [download] = await Promise.all([
    page.waitForEvent("download"),
    openExport(page, "Full view"),
  ]);
  await expectPng(download, /^whiteboard-full-.*\.png$/);
});

test("exports a selected area as a PNG after dragging a marquee", async ({ page }) => {
  await openExport(page, "Selected area");

  // We are now in area-select mode: dragging a rectangle triggers the export.
  const downloadPromise = page.waitForEvent("download");
  const a = await worldToClient(page, -120, -60);
  const b = await worldToClient(page, 160, 80);
  await page.mouse.move(a.x, a.y);
  await page.mouse.down();
  await page.mouse.move((a.x + b.x) / 2, (a.y + b.y) / 2, { steps: 4 });
  await page.mouse.move(b.x, b.y, { steps: 4 });
  await page.mouse.up();

  const download = await downloadPromise;
  await expectPng(download, /^whiteboard-area-.*\.png$/);
});

test("pressing Escape cancels the area-export selection", async ({ page }) => {
  await openExport(page, "Selected area");

  // After Escape the marquee is cancelled, so a subsequent drag must not export.
  await page.keyboard.press("Escape");

  let downloaded = false;
  page.on("download", () => (downloaded = true));
  const a = await worldToClient(page, -100, -50);
  const b = await worldToClient(page, 100, 50);
  await page.mouse.move(a.x, a.y);
  await page.mouse.down();
  await page.mouse.move(b.x, b.y, { steps: 4 });
  await page.mouse.up();
  await page.waitForTimeout(300);
  expect(downloaded).toBe(false);
});
