import { html, TemplateResult } from "lit";
import { unsafeHTML } from "lit/directives/unsafe-html.js";
import { WhiteboardTool } from "../../lib/tool";
import { getIconSvg } from "../../lib/icons";
import { MoveItem } from "./item";

export const MOVE_TOOL_NAME = "move";

export class MoveTool extends WhiteboardTool<MoveItem> {
  private originX: number | null = null;
  private originY: number | null = null;

  /**
   * Get the icon of the tool.
   * Return `null` if the tool does not have an icon.
   *
   * @returns The icon of the tool.
   */
  public override getIcon(): TemplateResult | null {
    return html`${unsafeHTML(getIconSvg("Move"))}`;
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
    return MOVE_TOOL_NAME;
  }

  public override handleDrawingStart(x: number, y: number): void {
    this.originX = x;
    this.originY = y;
  }

  public override handleDrawingMove(x: number, y: number): void {
    if (this.originX === null || this.originY === null) {
      return;
    }

    const whiteboard = this.getSimpleWhiteboardInstance();
    const { x: offsetX, y: offsetY } = whiteboard
      .getCoordsContext()
      .getOffset();
    whiteboard
      .getCoordsContext()
      .setOffset(offsetX + x - this.originX, offsetY + y - this.originY);

    this.originX = x;
    this.originY = y;
  }

  public override handleDrawingEnd(): void {
    this.originX = null;
    this.originY = null;
  }
}
