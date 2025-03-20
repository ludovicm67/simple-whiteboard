import { html, TemplateResult } from "lit";
import { unsafeHTML } from "lit/directives/unsafe-html.js";
import { WhiteboardTool } from "../../lib/tool";
import { getIconSvg } from "../../lib/icons";
import { PointerItem } from "./item";
import { throttle } from "../../lib/time";
import { WhiteboardItem, WhiteboardItemType } from "../../lib/item";

export const POINTER_TOOL_NAME = "pointer";

export class PointerTool extends WhiteboardTool<PointerItem> {
  private throttleMouseMove = throttle(this.handleMouseMoveThrottled, 150);

  /**
   * Get the icon of the tool.
   * Return `null` if the tool does not have an icon.
   *
   * @returns The icon of the tool.
   */
  public override getIcon(): TemplateResult | null {
    return html`${unsafeHTML(getIconSvg("MousePointer"))}`;
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
    return POINTER_TOOL_NAME;
  }

  private findSelectedItemUnderPointer(
    x: number,
    y: number
  ): WhiteboardItem<WhiteboardItemType> | null {
    const whiteboard = this.getSimpleWhiteboardInstance();
    const items = whiteboard.getItems();
    for (let i = items.length - 1; i >= 0; i--) {
      const item = items[i];
      const boundingBox = item.getBoundingBox();
      if (boundingBox === null) {
        continue;
      }

      if (
        x >= boundingBox.x &&
        x <= boundingBox.x + boundingBox.width &&
        y >= boundingBox.y &&
        y <= boundingBox.y + boundingBox.height
      ) {
        return item;
      }
    }
    return null;
  }

  private handleMouseMoveThrottled(e: MouseEvent): void {
    const whiteboard = this.getSimpleWhiteboardInstance();
    const coordsContext = whiteboard.getCoordsContext();
    const { x: whiteboardX, y: whiteboardY } = coordsContext.convertFromCanvas(
      e.offsetX,
      e.offsetY
    );

    const hoveredItem = this.findSelectedItemUnderPointer(
      whiteboardX,
      whiteboardY
    );
    whiteboard.setHoveredItemId(hoveredItem?.getId() || null);
  }
  public override handleMouseMove(e: MouseEvent): void {
    this.throttleMouseMove(e);
  }

  public override handleDrawingMove(x: number, y: number): void {
    const whiteboard = this.getSimpleWhiteboardInstance();
    const coordsContext = whiteboard.getCoordsContext();
    const { x: whiteboardX, y: whiteboardY } = coordsContext.convertFromCanvas(
      x,
      y
    );
  }
}
