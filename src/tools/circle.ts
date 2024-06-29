import { html } from "lit";
import { customElement } from "lit/decorators.js";
import { unsafeHTML } from "lit/directives/unsafe-html.js";

import SimpleWhiteboardTool from "../lib/SimpleWhiteboardTool";
import { getIconSvg } from "../lib/icons";

@customElement("simple-whiteboard--tool-circle")
export class SimpleWhiteboardToolCircle extends SimpleWhiteboardTool {
  public getToolIcon() {
    return html`${unsafeHTML(getIconSvg("circle"))}`;
  }

  public getToolName() {
    return "circle";
  }
}
