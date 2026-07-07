import { css } from "lit";

export const styles = css`
  /*
   * Design tokens.
   * These custom properties can be overridden from the outside to theme the
   * whiteboard (e.g. \`simple-whiteboard { --sw-accent: #7c3aed; }\`).
   */
  :host {
    --sw-board: #fcfcff;
    --sw-surface: #ffffff;
    /* Frosted, semi-transparent surface used by every floating panel. */
    --sw-surface-translucent: color-mix(
      in srgb,
      var(--sw-surface) 88%,
      transparent
    );
    --sw-surface-muted: #f2f3f5;
    --sw-border: rgba(15, 23, 42, 0.08);
    --sw-text: #1f2933;
    --sw-text-muted: rgba(31, 41, 51, 0.55);
    --sw-accent: #135aa0;
    --sw-accent-soft: rgba(19, 90, 160, 0.12);
    --sw-radius: 10px;
    --sw-radius-sm: 6px;
    --sw-shadow: 0 1px 2px rgba(15, 23, 42, 0.06),
      0 6px 16px rgba(15, 23, 42, 0.1);

    overflow: hidden;
  }

  .root {
    height: 100%;
    width: 100%;
    background-color: var(--sw-board);
    color: var(--sw-text);
    position: relative;
    overflow: hidden;
  }

  .button {
    background-color: var(--sw-surface-muted);
    border-radius: var(--sw-radius-sm);
    padding: 8px;
    border: 1px solid var(--sw-border);
    color: var(--sw-text);
    cursor: pointer;
    font: inherit;
    transition: background-color 0.15s ease, border-color 0.15s ease;
  }
  .button:hover {
    background-color: rgba(15, 23, 42, 0.08);
  }

  .width-100-percent {
    width: 100%;
  }

  .hidden {
    display: none;
  }

  /* Keyboard focus should always be clearly visible for accessibility. */
  button:focus-visible,
  select:focus-visible {
    outline: 2px solid var(--sw-accent);
    outline-offset: 2px;
  }

  .menu {
    position: absolute;
    z-index: 2;
    top: 16px;
    left: 16px;
    user-select: none;
  }

  .menu button:hover {
    background-color: var(--sw-surface-muted);
  }

  .tools {
    display: flex;
    flex-direction: row;
    align-items: center;
    justify-content: start;
    user-select: none;
    gap: 2px;
    padding: 4px;
    border-radius: var(--sw-radius);
    background-color: var(--sw-surface-translucent);
    -webkit-backdrop-filter: blur(8px);
    backdrop-filter: blur(8px);
    border: 1px solid var(--sw-border);
    margin: auto;
    position: absolute;
    z-index: 1;
    top: 16px;
    left: 50%;
    transform: translateX(-50%);
    box-shadow: var(--sw-shadow);
    overflow-x: auto;
    white-space: nowrap;
    max-width: calc(100% - 128px);
    scrollbar-width: thin;
  }

  .tools button {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    background-color: transparent;
    color: var(--sw-text);
    border: none;
    cursor: pointer;
    padding: 8px;
    border-radius: var(--sw-radius-sm);
    transition: background-color 0.15s ease, color 0.15s ease;
    position: relative;
  }

  .tools button:hover {
    background-color: rgba(15, 23, 42, 0.06);
  }

  .tools button:active {
    background-color: rgba(15, 23, 42, 0.1);
  }

  /* The currently selected tool is highlighted with the accent color. */
  .tools .tools--active,
  .tools .tools--active:hover {
    background-color: var(--sw-accent-soft);
    color: var(--sw-accent);
  }

  #tools-tooltip {
    position: absolute;
    top: 62px;
    z-index: 2;
    display: none;
    background-color: #1f2933;
    color: #fff;
    box-shadow: var(--sw-shadow);
    padding: 4px 8px;
    font-size: 12px;
    border-radius: var(--sw-radius-sm);
    pointer-events: none;
    white-space: nowrap;
  }

  .tools-options {
    user-select: none;
    position: absolute;
    z-index: 1;
    box-shadow: var(--sw-shadow);
    border: 1px solid var(--sw-border);
    top: 88px;
    width: 200px;
    left: 16px;
    background-color: var(--sw-surface-translucent);
    -webkit-backdrop-filter: blur(8px);
    backdrop-filter: blur(8px);
    border-radius: var(--sw-radius);
    padding: 12px 14px;
  }

  .tools-options p {
    font-size: 13px;
    font-weight: 500;
    color: var(--sw-text-muted);
    margin: 0 0 6px;
  }

  .tools-options p:not(:first-child) {
    margin-top: 12px;
  }

  /* Range sliders and other native controls follow the accent color. */
  .tools-options input[type="range"] {
    accent-color: var(--sw-accent);
  }

  .footer-tools {
    position: absolute;
    z-index: 1;
    bottom: 0;
    left: 0;
    background-color: var(--sw-surface-translucent);
    -webkit-backdrop-filter: blur(8px);
    backdrop-filter: blur(8px);
    padding: 4px 10px;
    border-top-right-radius: var(--sw-radius);
    box-shadow: var(--sw-shadow);
    display: flex;
    justify-content: space-between;
    flex-direction: row;
    align-items: center;
    gap: 8px;
    color: var(--sw-text-muted);
  }

  .footer-tools select {
    color: var(--sw-text-muted);
    background: transparent;
    border: 1px solid var(--sw-border);
    border-radius: var(--sw-radius-sm);
    padding: 3px 6px;
    font: inherit;
    cursor: pointer;
  }

  .history-tools {
    display: flex;
    flex-direction: row;
    align-items: center;
    gap: 2px;
  }

  .history-button {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    background-color: transparent;
    color: var(--sw-text);
    border: none;
    border-radius: var(--sw-radius-sm);
    padding: 4px;
    cursor: pointer;
    transition: background-color 0.15s ease;
  }

  .history-button:hover:not(:disabled) {
    background-color: rgba(15, 23, 42, 0.06);
  }

  .history-button:disabled {
    color: rgba(15, 23, 42, 0.25);
    cursor: default;
  }

  .footer-tools pre {
    margin: 0;
    font-size: 12px;
    font-variant-numeric: tabular-nums;
  }

  @media (max-width: 450px) {
    .tools-options {
      width: calc(100% - 64px);
    }
  }

  canvas {
    top: 0;
    left: 0;
    position: absolute;
    right: 0;
    bottom: 0;
    width: 100%;
    height: 100%;
    touch-action: none;
  }
`;
