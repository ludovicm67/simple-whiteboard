import { html } from "lit";
import { customElement } from "lit/decorators.js";
import { icons } from "feather-icons";
import SimpleWhiteboardTool from "../lib/SimpleWhiteboardTool";
import { unsafeHTML } from "lit/directives/unsafe-html.js";

@customElement("simple-whiteboard--tool-rect")
export class SimpleWhiteboard extends SimpleWhiteboardTool {
  public getToolIcon() {
    return html`${unsafeHTML(icons["square"].toSvg())}`;
  }
}
