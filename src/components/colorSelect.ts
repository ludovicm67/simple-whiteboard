import { html, css, LitElement } from "lit";
import { customElement, property } from "lit/decorators.js";

@customElement("color-select")
export class ColorSelect extends LitElement {
  static styles = css`
    div {
      display: inline-block;
      width: 24px;
      height: 24px;
      background-color: var(--bg-color, #fff);
      border-radius: 5px;
      padding: 12px;
      cursor: pointer;
      border: 1px solid var(--border-color, #fff);
      box-sizing: border-box;
      background-image: var(--bg-image, none);
      margin: 2px;
    }

    div.transparent {
      background-image: linear-gradient(45deg, #ccc 25%, transparent 25%),
        linear-gradient(-45deg, #ccc 25%, transparent 25%),
        linear-gradient(45deg, transparent 75%, #ccc 75%),
        linear-gradient(-45deg, transparent 75%, #ccc 75%);
      background-size: 10px 10px;
      background-position: 0 0, 0 5px, 5px -5px, -5px 0px;
    }

    div:hover {
      border: 1px solid #000;
    }
  `;

  @property({ type: String })
  color = "#000000";

  @property({ type: Boolean })
  selected = false;

  updated(changedProperties: Map<string | number | symbol, unknown>) {
    if (changedProperties.has("color")) {
      this.style.setProperty("--bg-color", this.color);
      if (this.color === "transparent") {
        this.style.setProperty("--bg-image", "var(--transparent-grid)");
        this.shadowRoot?.querySelector("div")?.classList.add("transparent");
      } else {
        this.style.setProperty("--bg-image", "none");
        this.shadowRoot?.querySelector("div")?.classList.remove("transparent");
      }
    }

    if (changedProperties.has("selected")) {
      this.style.setProperty("--border-color", this.selected ? "#000" : "#fff");
    }
  }

  handleClick() {
    this.dispatchEvent(
      new CustomEvent("color-click", {
        detail: { color: this.color },
        bubbles: true,
        composed: true,
      })
    );
  }

  render() {
    return html`<div @click="${this.handleClick}"></div>`;
  }
}
