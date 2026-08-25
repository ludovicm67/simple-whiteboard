/**
 * Theme switch for the marketing site (index.html, api.html, 404.html).
 *
 * The pages follow the visitor's OS preference on their own — the palette in
 * `site.css` is built on `light-dark()`, which reads `color-scheme`. This
 * module only handles the explicit choice: clicking the nav toggle pins a
 * theme by setting `data-theme` on `<html>`, which narrows that scheme, and
 * remembers it. The whiteboard component itself stays light for now.
 *
 * A tiny copy of the "read the stored theme" step is inlined in each page's
 * `<head>`, because this module runs too late to prevent a flash of the wrong
 * theme when a visitor has pinned one.
 */

/** Where the explicit choice is remembered. Shared with the inline snippet. */
const STORAGE_KEY = "sw-site-theme";

type Theme = "light" | "dark";

const darkQuery = window.matchMedia("(prefers-color-scheme: dark)");

/** The theme currently displayed, pinned or inherited from the OS. */
const activeTheme = (): Theme => {
  const pinned = document.documentElement.dataset.theme;
  if (pinned === "light" || pinned === "dark") {
    return pinned;
  }
  return darkQuery.matches ? "dark" : "light";
};

const applyTheme = (theme: Theme): void => {
  document.documentElement.dataset.theme = theme;
  try {
    localStorage.setItem(STORAGE_KEY, theme);
  } catch {
    // Storage unavailable (private mode, blocked cookies) — the choice simply
    // does not outlive the page.
  }
};

/**
 * Keep the button's accessible name in sync: the icon shows the theme it
 * switches to, and so should the label.
 */
const labelToggle = (button: HTMLElement): void => {
  const next = activeTheme() === "dark" ? "light" : "dark";
  const label = `Switch to the ${next} theme`;
  button.setAttribute("aria-label", label);
  button.setAttribute("title", label);
};

const button = document.querySelector<HTMLButtonElement>("[data-theme-toggle]");
if (button) {
  labelToggle(button);
  button.addEventListener("click", () => {
    applyTheme(activeTheme() === "dark" ? "light" : "dark");
    labelToggle(button);
  });
  // While no choice is pinned, the OS can still flip the theme under us.
  darkQuery.addEventListener("change", () => labelToggle(button));
}
