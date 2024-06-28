import { html } from "lit";
import { customElement } from "lit/decorators.js";
import { unsafeHTML } from "lit/directives/unsafe-html.js";

import SimpleWhiteboardTool from "../lib/SimpleWhiteboardTool";
import { getIconSvg } from "../lib/icons";

@customElement("simple-whiteboard--tool-pointer")
export class SimpleWhiteboardToolPointer extends SimpleWhiteboardTool {
  public getToolIcon() {
    return html`${unsafeHTML(getIconSvg("mouse-pointer"))}`;
  }
}
