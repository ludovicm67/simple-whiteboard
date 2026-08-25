import { test } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { openApp, expect } from "./helpers";

/** WCAG 2.0 A + AA violations on whatever is currently rendered. */
const violations = async (page: import("@playwright/test").Page) => {
  const result = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa"])
    .analyze();
  return result.violations.map(
    (v) => `${v.id}: ${v.help} (${v.nodes.length} node(s))`
  );
};

/** What currently has focus, looked up through shadow roots. */
const focused = (page: import("@playwright/test").Page) =>
  page.evaluate(() => {
    const deep = (root: Document | ShadowRoot): Element | null => {
      const el = (root as { activeElement?: Element | null }).activeElement;
      const nested = (el as HTMLElement | null)?.shadowRoot;
      return nested?.activeElement ? deep(nested) : el ?? null;
    };
    const el = deep(document);
    if (!el) return "none";
    return (
      el.getAttribute("aria-label") ||
      (el as HTMLElement).title ||
      (el.textContent || "").trim().slice(0, 30)
    );
  });

test.describe("accessibility", () => {
  for (const path of ["/index.html", "/api.html", "/404.html", "/app.html"]) {
    for (const scheme of ["light", "dark"] as const) {
      test(`${path} has no WCAG violations (${scheme})`, async ({ page }) => {
        await page.emulateMedia({ colorScheme: scheme });
        await page.goto(path);
        await page.waitForTimeout(600);
        expect(await violations(page)).toEqual([]);
      });
    }
  }

  test("the tool panels and menus stay clean", async ({ page }) => {
    await openApp(page);
    for (const tool of ["rect", "pen", "text", "sticky", "picture", "eraser"]) {
      await page.evaluate(
        (t) => (document.getElementById("app") as any).setCurrentTool(t),
        tool
      );
      expect(await violations(page), `tool ${tool}`).toEqual([]);
    }

    await page.locator("simple-whiteboard-menu .menu-button").click();
    await page.locator("simple-whiteboard-menu .menu-item").first().click();
    expect(await violations(page), "menu open").toEqual([]);
    await page.keyboard.press("Escape");

    await page.locator(".footer-tools .zoom-button").click();
    expect(await violations(page), "zoom open").toEqual([]);
  });

  test("the confirmation dialog is modal and clean", async ({ page }) => {
    await openApp(page);
    // Something to lose, so the clear tool asks first.
    await page.evaluate(() => {
      const app = document.getElementById("app") as any;
      app.setCurrentTool("rect");
    });
    const board = (await page.locator("simple-whiteboard").boundingBox())!;
    await page.mouse.move(board.x + 300, board.y + 260);
    await page.mouse.down();
    await page.mouse.move(board.x + 400, board.y + 340, { steps: 4 });
    await page.mouse.up();

    await page.locator("simple-whiteboard").locator(".tools button").last().click();
    const dialog = page.locator("simple-whiteboard").locator("dialog.confirm");
    await expect(dialog).toBeVisible();

    // Modal: the platform keeps focus inside and the board inert.
    expect(
      await page.evaluate(() => {
        const app = document.getElementById("app") as any;
        return app.shadowRoot.querySelector("dialog").matches(":modal");
      })
    ).toBe(true);
    expect(await violations(page)).toEqual([]);

    // Closing hands focus back to the button that opened it.
    await page.keyboard.press("Escape");
    expect(await focused(page)).toBe("Clear whiteboard");
  });

  test("the site can be entered with a skip link", async ({ page }) => {
    await page.goto("/index.html");
    await page.keyboard.press("Tab");
    expect(await focused(page)).toBe("Skip to content");
    await page.keyboard.press("Enter");
    expect(new URL(page.url()).hash).toBe("#main");
  });

  test("the toolbar is one tab stop, walked with the arrows", async ({
    page,
  }) => {
    await openApp(page);
    await page.evaluate(() => {
      const app = document.getElementById("app") as any;
      app.shadowRoot.querySelector('.tools button[tabindex="0"]').focus();
    });
    expect(await focused(page)).toBe("Move (view)");
    await page.keyboard.press("ArrowRight");
    expect(await focused(page)).toBe("Selection");
    await page.keyboard.press("Home");
    expect(await focused(page)).toBe("Move (view)");
    await page.keyboard.press("ArrowRight");
    await page.keyboard.press("Enter");
    expect(
      await page.evaluate(() =>
        (document.getElementById("app") as any).getCurrentTool()
      )
    ).toBe("pointer");
  });

  test("items can be selected, moved and deleted from the keyboard", async ({
    page,
  }) => {
    await openApp(page);
    const board = (await page.locator("simple-whiteboard").boundingBox())!;
    // Drawing is a pointer gesture; everything after it is keyboard-only.
    await page.evaluate(() =>
      (document.getElementById("app") as any).setCurrentTool("rect")
    );
    await page.mouse.move(board.x + 300, board.y + 260);
    await page.mouse.down();
    await page.mouse.move(board.x + 430, board.y + 370, { steps: 4 });
    await page.mouse.up();
    await page.evaluate(() =>
      (document.getElementById("app") as any).setCurrentTool("pointer")
    );

    const status = () =>
      page
        .locator("simple-whiteboard")
        .locator('[role="status"]')
        .textContent();
    await page.evaluate(() => {
      const app = document.getElementById("app") as any;
      app.shadowRoot.querySelector("canvas").focus();
    });

    await page.keyboard.press("Enter");
    expect((await status())?.trim()).toContain("1 of 1");

    const before = await page.evaluate(
      () =>
        (document.getElementById("app") as any).getSelectedItem().getBoundingBox()
          .x
    );
    await page.keyboard.press("Shift+ArrowRight");
    const after = await page.evaluate(
      () =>
        (document.getElementById("app") as any).getSelectedItem().getBoundingBox()
          .x
    );
    expect(after).toBeGreaterThan(before);

    await page.keyboard.press("Backspace");
    expect(
      await page.evaluate(
        () => (document.getElementById("app") as any).getItems().length
      )
    ).toBe(0);
  });

  test("the menu and the zoom picker open from the keyboard", async ({
    page,
  }) => {
    await openApp(page);
    await page.evaluate(() => {
      const app = document.getElementById("app") as any;
      app.shadowRoot
        .querySelector("simple-whiteboard-menu")
        .shadowRoot.querySelector(".menu-button")
        .focus();
    });
    await page.keyboard.press("Enter");
    await page.keyboard.press("Tab");
    await page.keyboard.press("Enter");
    await expect(
      page.locator("simple-whiteboard-menu .menu-item").first()
    ).toHaveAttribute("aria-expanded", "true");

    await page.keyboard.press("Escape");
    await page.evaluate(() => {
      const app = document.getElementById("app") as any;
      app.shadowRoot
        .querySelector("simple-whiteboard-zoom-select")
        .shadowRoot.querySelector(".zoom-button")
        .focus();
    });
    await page.keyboard.press("Enter");
    await page.keyboard.press("Tab");
    await page.keyboard.press("Enter");
    expect(
      await page.evaluate(() =>
        (document.getElementById("app") as any).getCoordsContext().getZoom()
      )
    ).toBe(0.25);
  });

  test("focus is never trapped inside the board", async ({ page }) => {
    await openApp(page);
    const stops: string[] = [];
    for (let i = 0; i < 25; i++) {
      await page.keyboard.press("Tab");
      stops.push(await focused(page));
    }
    // Reaching the page's own links proves focus leaves the component.
    expect(stops.some((s) => s.includes("Home") || s.includes("GitHub"))).toBe(
      true
    );
  });
});
