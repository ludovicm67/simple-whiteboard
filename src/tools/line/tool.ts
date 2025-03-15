import { html, TemplateResult } from "lit";
import { unsafeHTML } from "lit/directives/unsafe-html.js";
import { WhiteboardTool } from "../../lib/tool";
import { getIconSvg } from "../../lib/icons";
import { LineItem } from "./item";
import { RoughCanvasOptions } from "../../lib/SimpleWhiteboardTool";

export const LINE_TOOL_NAME = "line";

export class LineTool extends WhiteboardTool<LineItem> {
  private currentItemId: string | null = null;
  private currentOptions: RoughCanvasOptions = {
    stroke: "#000000",
    strokeWidth: 1,
  };

  /**
   * Get the icon of the tool.
   * Return `null` if the tool does not have an icon.
   *
   * @returns The icon of the tool.
   */
  public override getIcon(): TemplateResult | null {
    return html`${unsafeHTML(getIconSvg("Minus"))}`;
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
    return LINE_TOOL_NAME;
  }

  public override handleDrawingStart(x: number, y: number): void {
    const whiteboard = this.getSimpleWhiteboardInstance();
    const { x: whiteboardX, y: whiteboardY } = whiteboard
      .getCoordsContext()
      .convertFromCanvas(x, y);

    const item = this.newItem({
      x1: whiteboardX,
      y1: whiteboardY,
      x2: whiteboardX,
      y2: whiteboardY,
      options: {
        ...this.getCurrentOptions(),
      },
    });
    this.currentItemId = item.getId();
    this.getSimpleWhiteboardInstance().addItem(item);
  }

  public override handleDrawingMove(x: number, y: number): void {
    if (!this.currentItemId) {
      return;
    }

    const whiteboard = this.getSimpleWhiteboardInstance();
    const { x: whiteboardX, y: whiteboardY } = whiteboard
      .getCoordsContext()
      .convertFromCanvas(x, y);

    const item = whiteboard.getItemById(this.currentItemId);
    if (!item || !(item instanceof LineItem)) {
      return;
    }

    item.partialUpdate({
      x2: whiteboardX,
      y2: whiteboardY,
    });
  }

  public override handleDrawingEnd(): void {
    this.currentItemId = null;
  }

  public getCurrentOptions(): RoughCanvasOptions {
    return this.currentOptions;
  }
}
