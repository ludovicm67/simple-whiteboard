import { html, css, LitElement } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import { unsafeHTML } from "lit/directives/unsafe-html.js";
import { getIconSvg } from "../lib/icons";
import { SimpleWhiteboard } from "../simple-whiteboard";

@customElement("simple-whiteboard-menu")
export class SimpleWhiteboardMenu extends LitElement {
  static styles = css`
    menu {
      padding: 0;
      margin: 0;
      display: flex;
      flex-direction: column;
      align-items: flex-start;
    }
    .btn-container {
      box-shadow: 0 0 8px rgba(0, 0, 0, 0.1);
      background-color: #fff;
      user-select: none;
      padding: 3px;
      border-radius: 8px;
    }
    button {
      background-color: #fff;
      border-radius: 8px;
      padding: 8px;
      border: none;
      cursor: pointer;
    }
    button:hover,
    li:hover {
      background-color: rgba(0, 0, 0, 0.05);
    }
    ul {
      margin: 4px 0 0 0;
      list-style-type: none;

      background-color: #fff;
      box-shadow: 0 0 8px rgba(0, 0, 0, 0.1);
      border-radius: 8px;
      padding: 3px;
      border: none;
    }
    li {
      font-size: 14px;
      padding: 4px 8px;
      cursor: pointer;
      border-radius: 3px;
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
