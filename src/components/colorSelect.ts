import { html, css, LitElement } from "lit";
import { customElement, property } from "lit/decorators.js";

/**
 * Human-readable names for the palette, so a swatch announces "Red" rather
 * than "#ff1a40". Anything outside the palette falls back to its value.
 */
const COLOR_NAMES: Record<string, string> = {
  transparent: "No fill",
  // Stroke palette
  "#000000": "Black",
  "#ff1a40": "Red",
  "#29b312": "Green",
  "#135aa0": "Blue",
  "#fc8653": "Orange",
  // Fill palette
  "#ff8dad": "Pink",
  "#9bff8c": "Light green",
  "#8fddff": "Light blue",
  "#ffc7a9": "Peach",
  // Sticky-note paper
  "#ffe084": "Yellow",
  "#ffc2d1": "Pink",
  "#b8f2c9": "Mint",
  "#a9d5ff": "Sky blue",
  "#ffd7a8": "Peach",
};

const colorName = (color: string): string =>
  COLOR_NAMES[color.toLowerCase()] ?? color;

@customElement("color-select")
export class ColorSelect extends LitElement {
  static styles = css`
    button {
      display: inline-block;
      width: 24px;
      height: 24px;
      background-color: var(--bg-color, #fff);
      border-radius: 6px;
      padding: 12px;
      cursor: pointer;
      border: 2px solid var(--border-color, transparent);
      box-shadow: inset 0 0 0 1px rgba(15, 23, 42, 0.12);
      box-sizing: border-box;
      background-image: var(--bg-image, none);
      margin: 2px;
      transition: border-color 0.15s ease, transform 0.1s ease;
    }

    button.transparent {
      background-image: linear-gradient(45deg, #ccc 25%, transparent 25%),
        linear-gradient(-45deg, #ccc 25%, transparent 25%),
        linear-gradient(45deg, transparent 75%, #ccc 75%),
        linear-gradient(-45deg, transparent 75%, #ccc 75%);
      background-size: 10px 10px;
      background-position: 0 0, 0 5px, 5px -5px, -5px 0px;
    }

    button:hover {
      border-color: var(--sw-accent, #135aa0);
      transform: scale(1.05);
    }

    button:focus-visible {
      outline: 2px solid var(--sw-accent, #135aa0);
      outline-offset: 2px;
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
        this.shadowRoot?.querySelector("button")?.classList.add("transparent");
      } else {
        this.style.setProperty("--bg-image", "none");
        this.shadowRoot?.querySelector("button")?.classList.remove("transparent");
      }
    }

    if (changedProperties.has("selected")) {
      this.style.setProperty(
        "--border-color",
        this.selected ? "var(--sw-accent, #135aa0)" : "transparent"
      );
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
    const name = colorName(this.color);
    return html`<button
      type="button"
      role="radio"
      aria-checked=${this.selected ? "true" : "false"}
      aria-label=${name}
      title=${name}
      @click="${this.handleClick}"
    ></button>`;
  }
}
