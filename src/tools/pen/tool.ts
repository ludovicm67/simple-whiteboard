import { html, TemplateResult } from "lit";
import { unsafeHTML } from "lit/directives/unsafe-html.js";
import { WhiteboardTool } from "../../lib/tool";
import { getIconSvg } from "../../lib/icons";
import { PenItem, PenItemOptions } from "./item";

export const PEN_TOOL_NAME = "pen";

export class PenTool extends WhiteboardTool<PenItem> {
  private currentItemId: string | null = null;
  private currentOptions: PenItemOptions = {
    size: 6,
    smoothing: 0.5,
    thinning: 0.5,
    streamline: 0.5,
    color: "#000000",
  };

  /**
   * Get the icon of the tool.
   * Return `null` if the tool does not have an icon.
   *
   * @returns The icon of the tool.
   */
  public override getIcon(): TemplateResult | null {
    return html`${unsafeHTML(getIconSvg("Edit2"))}`;
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
    return PEN_TOOL_NAME;
  }

  public override handleDrawingStart(x: number, y: number): void {
    const whiteboard = this.getSimpleWhiteboardInstance();
    const { x: whiteboardX, y: whiteboardY } = whiteboard
      .getCoordsContext()
      .convertFromCanvas(x, y);

    const item = this.newItem({
      path: [{ x: whiteboardX, y: whiteboardY }],
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
    if (!item || !(item instanceof PenItem)) {
      return;
    }

    const itemData = item.export().data;
    item.partialUpdate({
      path: [...itemData.path, { x: whiteboardX, y: whiteboardY }],
    });
  }

  public override handleDrawingEnd(): void {
    this.currentItemId = null;
  }

  public getCurrentOptions(): PenItemOptions {
    return this.currentOptions;
  }
}
