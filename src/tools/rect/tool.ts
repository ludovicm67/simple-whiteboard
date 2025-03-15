import { html, TemplateResult } from "lit";
import { unsafeHTML } from "lit/directives/unsafe-html.js";
import { WhiteboardTool } from "../../lib/tool";
import { getIconSvg } from "../../lib/icons";
import { RectItem } from "./item";
import { RoughCanvasOptions } from "../../lib/SimpleWhiteboardTool";

export const RECT_TOOL_NAME = "rect";

export class RectTool extends WhiteboardTool<RectItem> {
  private currentItemId: string | null = null;
  private currentOptions: RoughCanvasOptions = {
    stroke: "#000000",
    strokeWidth: 1,
    fill: "transparent",
  };

  /**
   * Get the icon of the tool.
   * Return `null` if the tool does not have an icon.
   *
   * @returns The icon of the tool.
   */
  public override getIcon(): TemplateResult | null {
    return html`${unsafeHTML(getIconSvg("Square"))}`;
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
    return RECT_TOOL_NAME;
  }

  public override handleDrawingStart(x: number, y: number): void {
    const whiteboard = this.getSimpleWhiteboardInstance();
    const { x: whiteboardX, y: whiteboardY } = whiteboard
      .getCoordsContext()
      .convertFromCanvas(x, y);

    const item = this.newItem({
      x: whiteboardX,
      y: whiteboardY,
      width: 0,
      height: 0,
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
    if (!item || !(item instanceof RectItem)) {
      return;
    }

    const itemData = item.export().data;

    const width = whiteboardX - itemData.x;
    const height = whiteboardY - itemData.y;

    item.partialUpdate({
      width,
      height,
    });
  }

  public override handleDrawingEnd(): void {
    this.currentItemId = null;
  }

  public getCurrentOptions(): RoughCanvasOptions {
    return this.currentOptions;
  }
}
