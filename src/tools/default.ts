import { LitElement, html } from "lit";
import { customElement } from "lit/decorators.js";

import "./rect";

@customElement("simple-whiteboard--tool-defaults")
export class SimpleWhiteboard extends LitElement {
  public render() {
    return html`
      <simple-whiteboard--tool-rect slot="tools"></simple-whiteboard--tool-rect>
      <simple-whiteboard--tool-rect slot="tools"></simple-whiteboard--tool-rect>
    `;
  }
}
