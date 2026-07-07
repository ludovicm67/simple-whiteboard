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
      --sw-border: rgba(15, 23, 42, 0.08);
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
      background-color: var(--sw-surface);
      border: 1px solid var(--sw-border);
      user-select: none;
      padding: 4px;
      border-radius: var(--sw-radius);
    }
    button {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      background-color: transparent;
      color: inherit;
      border-radius: var(--sw-radius-sm);
      padding: 8px;
      border: none;
      cursor: pointer;
      transition: background-color 0.15s ease;
    }
    button:hover,
    li:hover {
      background-color: var(--sw-accent-soft);
    }
    button:focus-visible,
    li:focus-visible {
      outline: 2px solid var(--sw-accent, #135aa0);
      outline-offset: 2px;
    }
    ul {
      margin: 6px 0 0 0;
      list-style-type: none;

      background-color: var(--sw-surface);
      box-shadow: var(--sw-shadow);
      border: 1px solid var(--sw-border);
      border-radius: var(--sw-radius);
      padding: 4px;
    }
    li {
      font-size: 14px;
      padding: 6px 10px;
      cursor: pointer;
      border-radius: var(--sw-radius-sm);
    }

    ul ul > li {
      width: max-content;
    }

    li > ul {
      display: none;
    }

    li:hover > ul {
      display: block;
      position: absolute;
      left: calc(100% - 10px);
      margin-top: -28px;
      max-height: 200px;
      overflow-y: auto;
    }
  `;

  @property()
  instance: SimpleWhiteboard | null = null;

  @state()
  isMenuOpen = false;

  connectedCallback(): void {
    if (!this.instance) {
      throw new Error("SimpleWhiteboard instance is required");
    }

    const i18nContext = this.instance.getI18nContext();
    const i18n = i18nContext.getInstance();
    i18n.on("languageChanged", (_lang: string) => {
      this.requestUpdate();
    });

    super.connectedCallback();
  }

  disconnectedCallback(): void {
    if (this.instance) {
      const i18nContext = this.instance.getI18nContext();
      const i18n = i18nContext.getInstance();
      i18n.off("languageChanged");
    }
    super.disconnectedCallback();
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

    const menuEntry = html`
      <li>
        ${i18nContext.t("menu-language")}
        <ul>
          ${locales.map((locale) => {
            return html`<li
              @click=${() => {
                i18nContext.setLocale(locale.value);
              }}
            >
              ${locale.label}
            </li>`;
          })}
        </ul>
      </li>
    `;

    return menuEntry;
  }

  exportCurrentCanvasAsPng() {
    if (this.instance) {
      const dateTime = new Date().toISOString().replace(/:/g, "-");
      this.instance.downloadCurrentCanvasAsPng({
        fileName: `whiteboard-${dateTime}.png`,
      });
    }
  }

  render() {
    if (!this.instance) {
      return null;
    }

    const i18nContext = this.instance.getI18nContext();

    return html`
      <menu>
        <div class="btn-container">
          <button @click=${() => (this.isMenuOpen = !this.isMenuOpen)}>
            ${unsafeHTML(getIconSvg("Menu"))}
          </button>
        </div>

        <ul style="display: ${this.isMenuOpen ? "block" : "none"}">
          <li>
            ${i18nContext.t("menu-export")}
            <ul>
              <li @click=${() => this.exportCurrentCanvasAsPng()}>
                ${i18nContext.t("menu-export-current-view-png")}
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
