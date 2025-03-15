import { html, TemplateResult } from "lit";
import { unsafeHTML } from "lit/directives/unsafe-html.js";
import { WhiteboardTool } from "../../lib/tool";
import { getIconSvg } from "../../lib/icons";
import { ClearItem } from "./item";

export const CLEAR_TOOL_NAME = "clear";

export class ClearTool extends WhiteboardTool<ClearItem> {
  /**
   * Get the icon of the tool.
   * Return `null` if the tool does not have an icon.
   *
   * @returns The icon of the tool.
   */
  public override getIcon(): TemplateResult | null {
    return html`${unsafeHTML(getIconSvg("Trash2"))}`;
  }

  /**
   * Get the name of the tool.
   * It's the name that will be used to identify the tool internally.
   * It should be unique.
   * By default, it returns the tag name of the tool in lowercase.
   *
   * @returns The name of the tool.
   */
  public override getName(): string {
    return CLEAR_TOOL_NAME;
  }

  /**
   * Called when the tool is selected.
   * This method should be implemented in the tool class if needed.
   */
  public override onToolSelected(): void {
    const simpleWhiteboard = this.getSimpleWhiteboardInstance();
    if (!simpleWhiteboard) {
      return;
    }
    simpleWhiteboard.clearWhiteboard();

    // Select the previous tool
    const previousTool = simpleWhiteboard.getPreviousTool();
    if (previousTool && previousTool !== this.getName()) {
      simpleWhiteboard.setCurrentTool(previousTool, false);
    }
  }
}
