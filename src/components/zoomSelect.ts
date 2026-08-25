import { html, css, LitElement } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import { unsafeHTML } from "lit/directives/unsafe-html.js";
import { getIconSvg } from "../lib/icons";
import { SimpleWhiteboard } from "../simple-whiteboard";

/** Zoom levels offered by the picker, as ratios (1 = 100%). */
const ZOOM_LEVELS = [0.25, 0.5, 0.75, 1, 1.5, 2, 4];

/**
 * How close the current zoom has to be to a level for that level to be shown
 * as the active one. Wheel and pinch zooming are continuous, so an exact match
 * is not something we can rely on.
 */
const ACTIVE_TOLERANCE = 0.005;

/**
 * The zoom picker shown in the footer.
 *
 * A native `<select>` cannot be styled consistently across browsers and
 * platforms, so this is a custom dropdown built from the same pieces as the
 * rest of the app (frosted panel, accent highlight, check mark on the active
 * row). Unlike a `<select>`, it can also display the exact current zoom level
 * — including the in-between values produced by wheel or pinch zooming.
 */
@customElement("simple-whiteboard-zoom-select")
export class SimpleWhiteboardZoomSelect extends LitElement {
  static styles = css`
    :host {
      /* Fallbacks in case the component is used outside a simple-whiteboard. */
      --sw-surface: #ffffff;
      --sw-surface-translucent: color-mix(
        in srgb,
        var(--sw-surface) 88%,
        transparent
      );
      --sw-border: rgba(15, 23, 42, 0.08);
      --sw-text: #1f2933;
      --sw-text-muted: #59626d;
      --sw-accent: #135aa0;
      --sw-accent-soft: rgba(19, 90, 160, 0.12);
      --sw-radius: 10px;
      --sw-radius-sm: 6px;
      --sw-shadow: 0 1px 2px rgba(15, 23, 42, 0.06),
        0 6px 16px rgba(15, 23, 42, 0.1);

      position: relative;
      display: inline-block;
      color: var(--sw-text);
      user-select: none;
    }

    .zoom-button {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      background-color: transparent;
      color: var(--sw-text-muted);
      border: 1px solid var(--sw-border);
      border-radius: var(--sw-radius-sm);
      padding: 3px 6px;
      font: inherit;
      font-variant-numeric: tabular-nums;
      cursor: pointer;
      transition: background-color 0.15s ease, color 0.15s ease;
    }
    .zoom-button:hover {
      background-color: rgba(15, 23, 42, 0.06);
      color: var(--sw-text);
    }
    .zoom-button.open {
      background-color: var(--sw-accent-soft);
      color: var(--sw-accent);
    }
    .zoom-button:focus-visible,
    .zoom-item:focus-visible {
      outline: 2px solid var(--sw-accent);
      outline-offset: 2px;
    }

    .zoom-value {
      min-width: 4ch;
      text-align: right;
    }

    .zoom-chevron {
      display: inline-flex;
      transition: transform 0.15s ease;
    }
    .zoom-button.open .zoom-chevron {
      transform: rotate(180deg);
    }

    /* The footer sits at the bottom of the board, so the list opens upwards. */
    .dropdown {
      list-style-type: none;
      position: absolute;
      bottom: calc(100% + 6px);
      left: 0;
      min-width: 100%;
      margin: 0;
      padding: 4px;
      background-color: var(--sw-surface-translucent);
      -webkit-backdrop-filter: blur(8px);
      backdrop-filter: blur(8px);
      box-shadow: var(--sw-shadow);
      border: 1px solid var(--sw-border);
      border-radius: var(--sw-radius);
      display: none;
    }
    .dropdown.open {
      display: block;
      animation: zoom-pop 0.13s ease;
    }

    .zoom-item {
      width: 100%;
      font: inherit;
      text-align: left;
      background: none;
      border: none;
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 14px;
      font-variant-numeric: tabular-nums;
      padding: 6px 10px;
      border-radius: var(--sw-radius-sm);
      cursor: pointer;
      white-space: nowrap;
      color: var(--sw-text);
    }
    .zoom-item:hover {
      background-color: var(--sw-accent-soft);
    }
    .zoom-item.active {
      color: var(--sw-accent);
    }

    .zoom-check {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 16px;
      flex: none;
      color: var(--sw-accent);
    }

    @keyframes zoom-pop {
      from {
        opacity: 0;
        transform: translateY(6px) scale(0.98);
      }
      to {
        opacity: 1;
        transform: none;
      }
    }
  `;

  @property()
  instance: SimpleWhiteboard | null = null;

  /**
   * The current zoom level. It is passed in (rather than read from the
   * whiteboard) so that the picker re-renders whenever the board zooms, wheel
   * and pinch gestures included.
   */
  @property({ type: Number })
  zoom = 1;

  @state()
  isOpen = false;

  // Close the dropdown when clicking anywhere outside of it.
  private readonly onDocumentPointerDown = (e: Event) => {
    if (this.isOpen && !e.composedPath().includes(this)) {
      this.isOpen = false;
    }
  };

  // Close the dropdown when pressing Escape.
  private readonly onKeyDown = (e: KeyboardEvent) => {
    if (e.key === "Escape" && this.isOpen) {
      this.isOpen = false;
    }
  };

  connectedCallback(): void {
    document.addEventListener("pointerdown", this.onDocumentPointerDown);
    document.addEventListener("keydown", this.onKeyDown);
    super.connectedCallback();
  }

  disconnectedCallback(): void {
    document.removeEventListener("pointerdown", this.onDocumentPointerDown);
    document.removeEventListener("keydown", this.onKeyDown);
    super.disconnectedCallback();
  }

  private select(level: number): void {
    this.instance?.setZoom(level);
    this.isOpen = false;
  }

  private label(level: number): string {
    return `${Math.round(level * 100)}%`;
  }

  render() {
    const title = this.instance?.getI18nContext().t("footer-zoom") ?? "Zoom";

    return html`
      <button
        class="zoom-button ${this.isOpen ? "open" : ""}"
        title=${title}
        aria-label=${title}
        aria-haspopup="true"
        aria-expanded=${this.isOpen}
        @click=${() => (this.isOpen = !this.isOpen)}
      >
        <span class="zoom-value">${this.label(this.zoom)}</span>
        <span class="zoom-chevron"
          >${unsafeHTML(getIconSvg("ChevronDown", { width: 14, height: 14 }))}</span
        >
      </button>

      <ul class="dropdown ${this.isOpen ? "open" : ""}" role="menu">
        ${ZOOM_LEVELS.map((level) => {
          const isActive = Math.abs(level - this.zoom) < ACTIVE_TOLERANCE;
          return html`<li role="none">
            <button
              type="button"
              class="zoom-item ${isActive ? "active" : ""}"
              role="menuitemradio"
              aria-checked=${isActive}
              @click=${() => this.select(level)}
            >
              <span class="zoom-check"
                >${isActive
                  ? unsafeHTML(getIconSvg("Check", { width: 15, height: 15 }))
                  : null}</span
              >
              <span>${this.label(level)}</span>
            </button>
          </li>`;
        })}
      </ul>
    `;
  }
}

export default SimpleWhiteboardZoomSelect;
