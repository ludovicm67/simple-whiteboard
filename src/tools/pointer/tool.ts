import { html, TemplateResult } from "lit";
import { unsafeHTML } from "lit/directives/unsafe-html.js";
import { WhiteboardTool } from "../../lib/tool";
import { getIconSvg } from "../../lib/icons";
import { PointerItem } from "./item";
import { throttle } from "../../lib/time";
import { WhiteboardItem, WhiteboardItemType } from "../../lib/item";

export const POINTER_TOOL_NAME = "pointer";

enum PointerAction {
  SELECT = "select",
  DRAG = "drag",
}

export class PointerTool extends WhiteboardTool<PointerItem> {
  private clickedItemId: string | null = null;
  private action: PointerAction = PointerAction.SELECT;
  private coords: { x: number; y: number } | null = null;

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

    // Cancel the hover effect if the user is dragging an item
    if (this.action === PointerAction.DRAG) {
      const hoveredItemId = whiteboard.getHoveredItemId();
      if (hoveredItemId) {
        whiteboard.setHoveredItemId(null);
      }
      return;
    }

    const hoveredItem = this.findSelectedItemUnderPointer(
      whiteboardX,
      whiteboardY
    );
    const hoveredItemId = hoveredItem?.getId() || null;
    whiteboard.setHoveredItemId(hoveredItemId);
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

    if (
      this.action === PointerAction.DRAG &&
      this.coords &&
      this.clickedItemId
    ) {
      const deltaX = whiteboardX - this.coords.x;
      const deltaY = whiteboardY - this.coords.y;
      this.coords = { x: whiteboardX, y: whiteboardY };

      const item = whiteboard.getItemById(this.clickedItemId);
      if (!item) {
        return;
      }
      const partialUpdate = item.relativeMoveOperation(deltaX, deltaY);
      if (partialUpdate === null) {
        return;
      }
      whiteboard.partialItemUpdateById(this.clickedItemId, partialUpdate);
    }
  }

  public override handleDrawingStart(x: number, y: number): void {
    const whiteboard = this.getSimpleWhiteboardInstance();
    const coordsContext = whiteboard.getCoordsContext();
    const { x: whiteboardX, y: whiteboardY } = coordsContext.convertFromCanvas(
      x,
      y
    );

    const currentSelectedItemId = whiteboard.getSelectedItemId();
    const hoveredItemId = whiteboard.getHoveredItemId();
    const potentialItem = this.findSelectedItemUnderPointer(
      whiteboardX,
      whiteboardY
    );

    const itemId = potentialItem ? potentialItem.getId() : null;
    whiteboard.setSelectedItemId(itemId);

    if (
      (currentSelectedItemId === itemId || hoveredItemId === itemId) &&
      potentialItem
    ) {
      this.action = PointerAction.DRAG;
      this.clickedItemId = itemId;
      this.coords = { x: whiteboardX, y: whiteboardY };
    }
  }

  public override handleDrawingEnd(): void {
    this.clickedItemId = null;
    this.action = PointerAction.SELECT;
    this.coords = null;
  }

  public override renderToolOptions(
    _item: PointerItem | null
  ): TemplateResult | null {
    const whiteboard = this.getSimpleWhiteboardInstance();
    const i18n = whiteboard.getI18nContext();

    if (!this.clickedItemId) {
      return html` <p>${i18n.t("tool-pointer-no-item-selected")}</p> `;
    }

    return null;
  }
}
