import { html, css, LitElement } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import { unsafeHTML } from "lit/directives/unsafe-html.js";
import { getIconSvg } from "../lib/icons";
import { SimpleWhiteboard } from "../simple-whiteboard";
import { SupportedLocales } from "../lib/locales";
import { localized, msg } from "@lit/localize";

@customElement("simple-whiteboard-menu")
@localized()
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
    }
  `;

  @property()
  instance: SimpleWhiteboard | null = null;

  @state()
  isMenuOpen = false;

  renderLocaleSelect() {
    if (!this.instance || this.instance.hideLocalePicker) {
      return null;
    }

    const locales = [
      { value: "en", label: "English" },
      { value: "de", label: "Deutsch" },
      { value: "fr", label: "Français" },
    ];

    const menuEntry = html`
      <li>
        ${msg("Language", { id: "menu-language" })}
        <ul>
          ${locales.map((locale) => {
            return html`<li
              @click=${() => {
                if (this.instance) {
                  this.instance.locale = locale.value as SupportedLocales;
                }
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
      this.instance.downloadCurrentCanvasAsPng();
    }
  }

  render() {
    return html`
      <menu>
        <div class="btn-container">
          <button @click=${() => (this.isMenuOpen = !this.isMenuOpen)}>
            ${unsafeHTML(getIconSvg("menu"))}
          </button>
        </div>

        <ul style="display: ${this.isMenuOpen ? "block" : "none"}">
          <li>
            ${msg("Export", { id: "menu-export" })}
            <ul>
              <li @click=${() => this.exportCurrentCanvasAsPng()}>
                ${msg("Current view as PNG", {
                  id: "menu-export-current-view-png",
                })}
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
