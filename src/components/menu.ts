import { html, css, LitElement } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import { unsafeHTML } from "lit/directives/unsafe-html.js";
import { getIconSvg } from "../lib/icons";
import { SimpleWhiteboard } from "../simple-whiteboard";

@customElement("simple-whiteboard-menu")
export class SimpleWhiteboardMenu extends LitElement {
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
      --sw-text-muted: #59626d;
      --sw-accent: #135aa0;
      --sw-accent-soft: rgba(19, 90, 160, 0.12);
      --sw-radius: 10px;
      --sw-radius-sm: 6px;
      --sw-shadow: 0 1px 2px rgba(15, 23, 42, 0.06),
        0 6px 16px rgba(15, 23, 42, 0.1);
      color: #1f2933;
    }

    menu {
      padding: 0;
      margin: 0;
      display: flex;
      flex-direction: column;
      align-items: flex-start;
    }

    .btn-container {
      box-shadow: var(--sw-shadow);
      background-color: var(--sw-surface-translucent);
      -webkit-backdrop-filter: blur(8px);
      backdrop-filter: blur(8px);
      border: 1px solid var(--sw-border);
      user-select: none;
      padding: 4px;
      border-radius: var(--sw-radius);
    }

    .menu-button {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      background-color: transparent;
      color: inherit;
      border-radius: var(--sw-radius-sm);
      padding: 8px;
      border: none;
      cursor: pointer;
      transition: background-color 0.15s ease, color 0.15s ease;
    }
    .menu-button:hover {
      background-color: rgba(15, 23, 42, 0.06);
    }
    .menu-button.active {
      background-color: var(--sw-accent-soft);
      color: var(--sw-accent);
    }
    .menu-button:focus-visible,
    .menu-item:focus-visible,
    .submenu-item:focus-visible {
      outline: 2px solid var(--sw-accent);
      outline-offset: -2px;
    }

    /* Dropdown panels (top-level and submenus). */
    .dropdown,
    .submenu {
      list-style-type: none;
      margin: 0;
      padding: 4px;
      background-color: var(--sw-surface-translucent);
      -webkit-backdrop-filter: blur(8px);
      backdrop-filter: blur(8px);
      box-shadow: var(--sw-shadow);
      border: 1px solid var(--sw-border);
      border-radius: var(--sw-radius);
    }

    .dropdown {
      margin-top: 6px;
      min-width: 190px;
      display: none;
    }
    .dropdown.open {
      display: block;
      animation: menu-pop 0.13s ease;
    }

    /* Menu rows: [icon] [label] [chevron/spacer]. */
    .menu-item,
    .submenu-item {
      width: 100%;
      font: inherit;
      text-align: left;
      background: none;
      border: none;
      display: flex;
      align-items: center;
      gap: 10px;
      font-size: 14px;
      padding: 7px 10px;
      cursor: pointer;
      border-radius: var(--sw-radius-sm);
      position: relative;
      white-space: nowrap;
      color: inherit;
    }
    .menu-item:hover,
    .submenu-item:hover {
      background-color: var(--sw-accent-soft);
    }

    .menu-item-icon,
    .menu-item-chevron,
    .submenu-check {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      color: var(--sw-text-muted);
      flex: none;
    }
    .menu-item-label {
      flex: 1;
    }
    .menu-item-chevron {
      margin-left: 6px;
    }
    .submenu-check {
      width: 16px;
    }

    /*
     * Submenus open to the right of their parent row. Opening is driven by
     * state rather than by hover alone, so pointer and keyboard both open
     * them and aria-expanded always tells the truth.
     */
    .submenu {
      position: absolute;
      top: -5px;
      left: calc(100% - 2px);
      min-width: 170px;
      display: none;
    }
    .menu-item-wrap {
      position: relative;
    }
    .menu-item-wrap.open > .submenu {
      display: block;
      animation: menu-pop 0.13s ease;
    }
    .submenu-scroll {
      max-height: 260px;
      overflow-y: auto;
      scrollbar-width: thin;
    }

    .submenu-item.active {
      color: var(--sw-accent);
    }
    .submenu-item.active .submenu-check {
      color: var(--sw-accent);
    }

    @keyframes menu-pop {
      from {
        opacity: 0;
        transform: translateY(-6px) scale(0.98);
      }
      to {
        opacity: 1;
        transform: none;
      }
    }
  `;

  @property()
  instance: SimpleWhiteboard | null = null;

  @state()
  isMenuOpen = false;

  /** Which submenu is currently open, if any. */
  @state()
  openSubmenu: string | null = null;

  // Close the menu when clicking anywhere outside of it.
  private readonly onDocumentPointerDown = (e: Event) => {
    if (this.isMenuOpen && !e.composedPath().includes(this)) {
      this.isMenuOpen = false;
      this.openSubmenu = null;
    }
  };

  // Close the menu when pressing Escape.
  private readonly onKeyDown = (e: KeyboardEvent) => {
    if (e.key !== "Escape") {
      return;
    }
    // Escape closes the open submenu first, then the menu itself.
    if (this.openSubmenu) {
      this.openSubmenu = null;
      return;
    }
    if (this.isMenuOpen) {
      this.isMenuOpen = false;
    }
  };

  connectedCallback(): void {
    if (!this.instance) {
      throw new Error("SimpleWhiteboard instance is required");
    }

    const i18nContext = this.instance.getI18nContext();
    const i18n = i18nContext.getInstance();
    i18n.on("languageChanged", (_lang: string) => {
      this.requestUpdate();
    });

    document.addEventListener("pointerdown", this.onDocumentPointerDown);
    document.addEventListener("keydown", this.onKeyDown);

    super.connectedCallback();
  }

  disconnectedCallback(): void {
    if (this.instance) {
      const i18nContext = this.instance.getI18nContext();
      const i18n = i18nContext.getInstance();
      i18n.off("languageChanged");
    }
    document.removeEventListener("pointerdown", this.onDocumentPointerDown);
    document.removeEventListener("keydown", this.onKeyDown);
    super.disconnectedCallback();
  }

  /**
   * Open a submenu (and close any other), or close it again.
   */
  private setSubmenu(id: string | null): void {
    this.openSubmenu = id;
  }

  /**
   * Render a Lucide icon by name.
   */
  private icon(name: string, size = 16) {
    return unsafeHTML(getIconSvg(name, { width: size, height: size }));
  }

  renderLocaleSelect() {
    if (!this.instance || this.instance.hideLocalePicker) {
      return null;
    }

    const i18nContext = this.instance.getI18nContext();

    const locales = [
      { value: "cs-CZ", label: "Čeština (CZ)" },
      { value: "cs", label: "Čeština" },
      { value: "de-DE", label: "Deutsch (DE)" },
      { value: "de", label: "Deutsch" },
      { value: "en-US", label: "English (US)" },
      { value: "en", label: "English" },
      { value: "es-AR", label: "Español (AR)" },
      { value: "es-CL", label: "Español (CL)" },
      { value: "es-CO", label: "Español (CO)" },
      { value: "es-ES", label: "Español (ES)" },
      { value: "es-MX", label: "Español (MX)" },
      { value: "es-PE", label: "Español (PE)" },
      { value: "es", label: "Español" },
      { value: "fr-FR", label: "Français (FR)" },
      { value: "fr", label: "Français" },
      { value: "it-IT", label: "Italiano (IT)" },
      { value: "it", label: "Italiano" },
      { value: "pl-PL", label: "Polski (PL)" },
      { value: "pl", label: "Polski" },
      { value: "pt-BR", label: "Português (BR)" },
      { value: "pt-PT", label: "Português (PT)" },
      { value: "pt", label: "Português" },
      { value: "tr-TR", label: "Türkçe (TR)" },
      { value: "tr", label: "Türkçe" },
    ];

    const currentLocale = i18nContext.getLocale();

    return html`
      <li
        role="none"
        class="menu-item-wrap ${this.openSubmenu === "language" ? "open" : ""}"
        @mouseenter=${() => this.setSubmenu("language")}
        @mouseleave=${() => this.setSubmenu(null)}
      >
        <button
          type="button"
          class="menu-item"
          role="menuitem"
          aria-haspopup="true"
          aria-expanded=${this.openSubmenu === "language"}
          @click=${() => this.setSubmenu("language")}
        >
          <span class="menu-item-icon">${this.icon("Languages")}</span>
          <span class="menu-item-label">${i18nContext.t("menu-language")}</span>
          <span class="menu-item-chevron">${this.icon("ChevronRight")}</span>
        </button>
        <ul class="submenu submenu-scroll" role="menu">
          ${locales.map((locale) => {
            const isActive = currentLocale === locale.value;
            return html`<li role="none">
              <button
                type="button"
                class="submenu-item ${isActive ? "active" : ""}"
                role="menuitemradio"
                aria-checked=${isActive}
                @click=${() => {
                  i18nContext.setLocale(locale.value);
                  this.isMenuOpen = false;
                  this.setSubmenu(null);
                }}
              >
                <span class="submenu-check"
                  >${isActive ? this.icon("Check", 15) : null}</span
                >
                <span class="menu-item-label">${locale.label}</span>
              </button>
            </li>`;
          })}
        </ul>
      </li>
    `;
  }

  private exportFileName(suffix = ""): string {
    const dateTime = new Date().toISOString().replace(/:/g, "-");
    return `whiteboard${suffix}-${dateTime}.png`;
  }

  exportCurrentCanvasAsPng() {
    if (this.instance) {
      this.instance.downloadCurrentCanvasAsPng({
        fileName: this.exportFileName(),
      });
    }
    this.isMenuOpen = false;
  }

  exportFullViewAsPng() {
    if (this.instance) {
      this.instance.downloadFullViewAsPng({
        fileName: this.exportFileName("-full"),
      });
    }
    this.isMenuOpen = false;
  }

  exportSelectedAreaAsPng() {
    if (this.instance) {
      // Enters area-selection mode; the export happens once the user drags a
      // rectangle on the canvas.
      this.instance.startAreaExport({
        fileName: this.exportFileName("-area"),
      });
    }
    this.isMenuOpen = false;
  }

  render() {
    if (!this.instance) {
      return null;
    }

    const i18nContext = this.instance.getI18nContext();

    return html`
      <menu>
        <div class="btn-container">
          <button
            class="menu-button ${this.isMenuOpen ? "active" : ""}"
            aria-label="Menu"
            aria-haspopup="true"
            aria-expanded=${this.isMenuOpen}
            @click=${() => (this.isMenuOpen = !this.isMenuOpen)}
          >
            ${this.icon("Menu", 18)}
          </button>
        </div>

        <ul class="dropdown ${this.isMenuOpen ? "open" : ""}" role="menu">
          <li
            role="none"
            class="menu-item-wrap ${this.openSubmenu === "export" ? "open" : ""}"
            @mouseenter=${() => this.setSubmenu("export")}
            @mouseleave=${() => this.setSubmenu(null)}
          >
            <button
              type="button"
              class="menu-item"
              role="menuitem"
              aria-haspopup="true"
              aria-expanded=${this.openSubmenu === "export"}
              @click=${() => this.setSubmenu("export")}
            >
              <span class="menu-item-icon">${this.icon("Download")}</span>
              <span class="menu-item-label"
                >${i18nContext.t("menu-export")}</span
              >
              <span class="menu-item-chevron">${this.icon("ChevronRight")}</span>
            </button>
            <ul class="submenu" role="menu">
              <li role="none">
                <button
                  type="button"
                  class="submenu-item"
                  role="menuitem"
                  @click=${() => this.exportCurrentCanvasAsPng()}
                >
                <span class="menu-item-icon">${this.icon("ImageDown")}</span>
                <span class="menu-item-label"
                  >${i18nContext.t("menu-export-current-view-png")}</span
                >
              </button>
              </li>
              <li role="none">
                <button
                  type="button"
                  class="submenu-item"
                  role="menuitem"
                  @click=${() => this.exportFullViewAsPng()}
                >
                <span class="menu-item-icon">${this.icon("Maximize")}</span>
                <span class="menu-item-label"
                  >${i18nContext.t("menu-export-full-view-png")}</span
                >
              </button>
              </li>
              <li role="none">
                <button
                  type="button"
                  class="submenu-item"
                  role="menuitem"
                  @click=${() => this.exportSelectedAreaAsPng()}
                >
                <span class="menu-item-icon">${this.icon("Crop")}</span>
                <span class="menu-item-label"
                  >${i18nContext.t("menu-export-selected-area-png")}</span
                >
              </button>
              </li>
            </ul>
          </li>
          ${this.renderLocaleSelect()}
        </ul>
      </menu>
    `;
  }
}

export default SimpleWhiteboardMenu;
