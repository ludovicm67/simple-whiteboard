import { html } from "lit";
import { customElement } from "lit/decorators.js";
import { unsafeHTML } from "lit/directives/unsafe-html.js";

import SimpleWhiteboardTool from "../lib/SimpleWhiteboardTool";
import { getIconSvg } from "../lib/icons";

@customElement("simple-whiteboard--tool-line")
export class SimpleWhiteboardToolLine extends SimpleWhiteboardTool {
  public getToolIcon() {
    return html`${unsafeHTML(getIconSvg("minus"))}`;
  }
}
