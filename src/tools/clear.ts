import { html } from "lit";
import { customElement } from "lit/decorators.js";
import { unsafeHTML } from "lit/directives/unsafe-html.js";

import SimpleWhiteboardTool from "../lib/SimpleWhiteboardTool";
import { getIconSvg } from "../lib/icons";

@customElement("simple-whiteboard--tool-clear")
export class SimpleWhiteboardToolClear extends SimpleWhiteboardTool {
  public getToolIcon() {
    return html`${unsafeHTML(getIconSvg("trash-2"))}`;
  }

  public getToolName() {
    return "clear";
  }

  public onToolSelected(): void {
    const simpleWhiteboard = this.getSimpleWhiteboardInstance();
    if (!simpleWhiteboard) {
      return;
    }
    simpleWhiteboard.clearWhiteboard();

    // Select the previous tool
    const previousTool = simpleWhiteboard.getPreviousTool();
    if (previousTool && previousTool !== this.getToolName()) {
      simpleWhiteboard.setCurrentTool(previousTool, false);
    }
  }
}
