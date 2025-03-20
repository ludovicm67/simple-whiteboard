import { LitElement, html } from "lit";
import { customElement } from "lit/decorators.js";

// Import all the tools
import "./move/element";
import "./pointer";
import "./rect/element";
import "./circle/element";
import "./line/element";
import "./pen/element";
import "./text";
import "./picture";
import "./eraser";
import "./clear/element";

@customElement("simple-whiteboard--tool-defaults")
export class DefaultTools extends LitElement {
  // This is a workaround to prevent LitElement from creating a shadow root.
  createRenderRoot() {
    return this;
  }

  public render() {
    return html`
      <simple-whiteboard--tool-move slot="tools"></simple-whiteboard--tool-move>
      <simple-whiteboard--tool-pointer
        slot="tools"
      ></simple-whiteboard--tool-pointer>
      <simple-whiteboard--tool-rect slot="tools"></simple-whiteboard--tool-rect>
      <simple-whiteboard--tool-circle
        slot="tools"
      ></simple-whiteboard--tool-circle>
      <simple-whiteboard--tool-line slot="tools"></simple-whiteboard--tool-line>
      <simple-whiteboard--tool-pen slot="tools"></simple-whiteboard--tool-pen>
      <simple-whiteboard--tool-text slot="tools"></simple-whiteboard--tool-text>
      <simple-whiteboard--tool-picture
        slot="tools"
      ></simple-whiteboard--tool-picture>
      <simple-whiteboard--tool-eraser
        slot="tools"
      ></simple-whiteboard--tool-eraser>
      <simple-whiteboard--tool-clear
        slot="tools"
      ></simple-whiteboard--tool-clear>
    `;
  }
}
