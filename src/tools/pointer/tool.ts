import { html, TemplateResult } from "lit";
import { unsafeHTML } from "lit/directives/unsafe-html.js";
import { WhiteboardTool } from "../../lib/tool";
import { getIconSvg } from "../../lib/icons";
import { PointerItem } from "./item";
import { throttle } from "../../lib/time";
import { WhiteboardItem, WhiteboardItemType } from "../../lib/item";
import { ResizeHandle } from "../../lib/types";
import { RESIZE_HANDLE_HIT_SIZE } from "../../lib/canvas";

export const POINTER_TOOL_NAME = "pointer";

enum PointerAction {
  SELECT = "select",
  DRAG = "drag",
  RESIZE = "resize",
}

/**
 * The cursor to show over a resize handle, derived from where the handle sits
 * relative to the center of the item. This works for any item without having
 * to know what its handles are called.
 *
 * @param handle The hovered resize handle.
 * @param box The bounding box of the item the handle belongs to.
 * @returns The name of the CSS cursor to use.
 */
const resizeCursor = (
  handle: ResizeHandle,
  box: { x: number; y: number; width: number; height: number } | null
): string => {
  if (!box) {
    return "pointer";
  }

  const dx = handle.x - (box.x + box.width / 2);
  const dy = handle.y - (box.y + box.height / 2);

  // A handle roughly on an axis only resizes along that axis.
  if (Math.abs(dy) < Math.abs(dx) / 4) {
    return "ew-resize";
  }
  if (Math.abs(dx) < Math.abs(dy) / 4) {
    return "ns-resize";
  }
  return dx * dy > 0 ? "nwse-resize" : "nesw-resize";
};

export class PointerTool extends WhiteboardTool<PointerItem> {
  private clickedItemId: string | null = null;
  private action: PointerAction = PointerAction.SELECT;
  private coords: { x: number; y: number } | null = null;
  private resizeHandleName: string | null = null;

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

  /**
   * Set the whiteboard cursor, but only when it actually changes: every change
   * triggers a re-render of the component.
   */
  private setCursor(cursor: string): void {
    const whiteboard = this.getSimpleWhiteboardInstance();
    if (whiteboard.getCursor() !== cursor) {
      whiteboard.setCursor(cursor);
    }
  }

  private handleMouseMoveThrottled(e: MouseEvent): void {
    const whiteboard = this.getSimpleWhiteboardInstance();
    const coordsContext = whiteboard.getCoordsContext();
    const { x: whiteboardX, y: whiteboardY } = coordsContext.convertFromCanvas(
      e.offsetX,
      e.offsetY
    );

    // Cancel the hover effect if the user is not selecting an item
    if (this.action !== PointerAction.SELECT) {
      const hoveredItemId = whiteboard.getHoveredItemId();
      if (hoveredItemId) {
        whiteboard.setHoveredItemId(null);
      }
      whiteboard.setHoveredResizeHandle(null);
      return;
    }

    // A resize handle of the selected item wins over whatever is underneath:
    // it is what a click would grab. Highlight it and show which way it
    // resizes, so the handles feel grabbable before being pressed.
    const selectedItem = whiteboard.getSelectedItem();
    const handle =
      selectedItem && selectedItem.isResizable()
        ? this.resizeHandleMatch(
            selectedItem.getResizeHandles(),
            whiteboardX,
            whiteboardY
          )
        : null;
    whiteboard.setHoveredResizeHandle(handle ? handle.name : null);

    if (handle && selectedItem) {
      whiteboard.setHoveredItemId(null);
      this.setCursor(resizeCursor(handle, selectedItem.getBoundingBox()));
      return;
    }

    const hoveredItem = this.findSelectedItemUnderPointer(
      whiteboardX,
      whiteboardY
    );
    const hoveredItemId = hoveredItem?.getId() || null;
    whiteboard.setHoveredItemId(hoveredItemId);
    this.setCursor(hoveredItem ? "move" : "default");
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

    if (
      this.action === PointerAction.RESIZE &&
      this.coords &&
      this.clickedItemId &&
      this.resizeHandleName
    ) {
      const deltaX = whiteboardX - this.coords.x;
      const deltaY = whiteboardY - this.coords.y;
      this.coords = { x: whiteboardX, y: whiteboardY };

      const item = whiteboard.getItemById(this.clickedItemId);
      if (!item) {
        return;
      }
      const partialUpdate = item.relativeResizeOperation(
        deltaX,
        deltaY,
        this.resizeHandleName
      );
      if (partialUpdate === null) {
        return;
      }
      whiteboard.partialItemUpdateById(this.clickedItemId, partialUpdate);
    }
  }

  /**
   * The resize handle at the given world coordinates, if any.
   *
   * Handles are drawn at a fixed on-screen size, so their grab area is sized in
   * canvas pixels too and converted back to world units: otherwise it would
   * shrink to nothing when zoomed out and cover half the item when zoomed in.
   */
  private resizeHandleMatch(
    resizeHandles: ResizeHandle[],
    x: number,
    y: number
  ): ResizeHandle | null {
    const whiteboard = this.getSimpleWhiteboardInstance();
    const zoom = whiteboard.getCoordsContext().getZoom();
    const halfHandleSize = RESIZE_HANDLE_HIT_SIZE / 2 / zoom;

    for (const handle of resizeHandles) {
      const { x: handleX, y: handleY } = handle;
      if (
        x >= handleX - halfHandleSize &&
        x <= handleX + halfHandleSize &&
        y >= handleY - halfHandleSize &&
        y <= handleY + halfHandleSize
      ) {
        return handle;
      }
    }
    return null;
  }

  public override handleDrawingStart(x: number, y: number): void {
    const whiteboard = this.getSimpleWhiteboardInstance();
    const coordsContext = whiteboard.getCoordsContext();
    const { x: whiteboardX, y: whiteboardY } = coordsContext.convertFromCanvas(
      x,
      y
    );

    this.action = PointerAction.SELECT;

    const currentSelectedItem = whiteboard.getSelectedItem();

    if (currentSelectedItem && currentSelectedItem.isResizable()) {
      const resizeHandles = currentSelectedItem.getResizeHandles();
      const resizeHandle = this.resizeHandleMatch(
        resizeHandles,
        whiteboardX,
        whiteboardY
      );
      if (resizeHandle) {
        this.action = PointerAction.RESIZE;
        this.clickedItemId = currentSelectedItem.getId();
        this.coords = { x: whiteboardX, y: whiteboardY };
        this.resizeHandleName = resizeHandle.name;
        return;
      }
    }

    const currentSelectedItemId = currentSelectedItem?.getId() || null;
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
    this.resizeHandleName = null;
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

  public override onToolUnselected(): void {
    super.onToolUnselected();
    // Leave no hover state behind for the next tool.
    const whiteboard = this.getSimpleWhiteboardInstance();
    whiteboard.setHoveredResizeHandle(null);
    whiteboard.setCursor("default");
  }
}
