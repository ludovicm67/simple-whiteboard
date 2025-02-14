import { TemplateResult, html } from "lit";
import { customElement } from "lit/decorators.js";
import { unsafeHTML } from "lit/directives/unsafe-html.js";
import { localized, msg } from "@lit/localize";

import SimpleWhiteboardTool, {
  WhiteboardItem,
} from "../lib/SimpleWhiteboardTool";
import { getIconSvg } from "../lib/icons";
import { SimpleWhiteboard } from "../simple-whiteboard";
import { throttle } from "../lib/time";

enum PointerAction {
  SELECT = "select",
  DRAG = "drag",
}

interface PointerItem extends WhiteboardItem {
  x: number;
  y: number;
  options: {
    selectedItemId: string | null;
    clickedItemId: string | null;
    action: PointerAction;
    clickedItemCoords: { x: number; y: number } | null;
  };
}

@customElement("simple-whiteboard--tool-pointer")
@localized()
export class SimpleWhiteboardToolPointer extends SimpleWhiteboardTool {
  private throttleMouseMove = throttle(this.handleMouseMoveThrottled, 150);

  public override getToolIcon() {
    return html`${unsafeHTML(getIconSvg("mouse-pointer"))}`;
  }

  public override getToolName() {
    return "pointer";
  }

  private findSelectedItemUnderPointer(
    simpleWhiteboard: SimpleWhiteboard,
    x: number,
    y: number
  ): WhiteboardItem | null {
    // Get all items that are under the pointer
    const items = [...simpleWhiteboard.getItems()].reverse();
    const potentialItems = items.filter((item) => {
      const tool = simpleWhiteboard.getToolInstance(item.kind);
      if (!tool) {
        return false;
      }
      const boundingRect = tool.getBoundingRect(item);
      if (!boundingRect) {
        return false;
      }
      const {
        x: bourdingRectX,
        y: boundingRectY,
        width,
        height,
      } = boundingRect;
      return (
        x > bourdingRectX &&
        x < bourdingRectX + width &&
        y > boundingRectY &&
        y < boundingRectY + height
      );
    });

    if (potentialItems.length > 0) {
      return potentialItems[0];
    }

    return null;
  }

  private handleMouseMoveThrottled(e: MouseEvent): void {
    const simpleWhiteboard = super.getSimpleWhiteboardInstance();
    if (!simpleWhiteboard) {
      return;
    }
    const { x: itemX, y: itemY } = simpleWhiteboard.coordsFromCanvasCoords(
      e.offsetX,
      e.offsetY
    );

    const hoveredItem = this.findSelectedItemUnderPointer(
      simpleWhiteboard,
      itemX,
      itemY
    );
    simpleWhiteboard.setHoveredItemId(hoveredItem?.id || null);
    simpleWhiteboard.draw();
  }
  public override handleMouseMove(e: MouseEvent): void {
    this.throttleMouseMove(e);
  }

  public override handleDrawingStart(x: number, y: number): void {
    const simpleWhiteboard = super.getSimpleWhiteboardInstance();
    if (!simpleWhiteboard) {
      return;
    }
    const itemId = super.generateId();

    const { x: itemX, y: itemY } = simpleWhiteboard.coordsFromCanvasCoords(
      x,
      y
    );

    let action = PointerAction.SELECT;

    const selectedItemId = simpleWhiteboard.getSelectedItemId();
    const itemClicked = this.findSelectedItemUnderPointer(
      simpleWhiteboard,
      itemX,
      itemY
    );

    let clickedItemCoords = null;
    if (selectedItemId && itemClicked && selectedItemId === itemClicked.id) {
      action = PointerAction.DRAG;
      const tool = simpleWhiteboard.getToolInstance(itemClicked.kind);
      if (tool) {
        clickedItemCoords = tool.getCoordsItem(itemClicked);
      }
    }

    const item: PointerItem = {
      kind: this.getToolName(),
      id: itemId,
      x: itemX,
      y: itemY,
      options: {
        clickedItemId: itemClicked ? itemClicked.id : null,
        selectedItemId: simpleWhiteboard.getSelectedItemId(),
        action,
        clickedItemCoords,
      },
    };

    simpleWhiteboard.setCurrentDrawing(item);
  }

  public override handleDrawingMove(x: number, y: number): void {
    const simpleWhiteboard = super.getSimpleWhiteboardInstance();
    if (!simpleWhiteboard) {
      return;
    }

    const currentDrawing = simpleWhiteboard.getCurrentDrawing();
    if (!currentDrawing) {
      return;
    }

    if (currentDrawing.kind !== this.getToolName()) {
      return;
    }

    if (currentDrawing.options.action !== PointerAction.DRAG) {
      return;
    }

    const pointerItem = currentDrawing as PointerItem;
    const pointerAction = pointerItem.options.action;
    const clickedItemId = pointerItem.options.clickedItemId;
    if (!clickedItemId || pointerAction !== PointerAction.DRAG) {
      return;
    }

    const clickedItem = simpleWhiteboard.getItemById(clickedItemId);
    if (!clickedItem) {
      return;
    }

    const tool = simpleWhiteboard.getToolInstance(clickedItem.kind);
    if (!tool) {
      return;
    }

    const { x: startX, y: startY, options } = currentDrawing as PointerItem;
    const { x: fixedX, y: fixedY } = simpleWhiteboard.coordsFromCanvasCoords(
      x,
      y
    );
    const { clickedItemCoords } = options;
    if (!clickedItemCoords) {
      return;
    }
    const { x: clickedItemX, y: clickedItemY } = clickedItemCoords;

    const deltaX = fixedX - startX;
    const deltaY = fixedY - startY;

    const movedInstance = tool.setCoordsItem(
      clickedItem,
      clickedItemX + deltaX,
      clickedItemY + deltaY
    );
    if (!movedInstance) {
      return;
    }

    simpleWhiteboard.updateItemById(clickedItemId, movedInstance, true);
  }

  public override handleDrawingEnd(): void {
    const simpleWhiteboard = super.getSimpleWhiteboardInstance();
    if (!simpleWhiteboard) {
      return;
    }

    const currentDrawing = simpleWhiteboard.getCurrentDrawing();
    if (!currentDrawing) {
      return;
    }

    if (currentDrawing.kind !== this.getToolName()) {
      return;
    }

    const { options } = currentDrawing as PointerItem;

    switch (options.action) {
      case PointerAction.SELECT:
        simpleWhiteboard.setSelectedItemId(options.clickedItemId);
        break;
      case PointerAction.DRAG:
        break;
    }

    simpleWhiteboard.setCurrentDrawing(null);
  }

  public override renderToolOptions(
    item: WhiteboardItem | null
  ): TemplateResult | null {
    const simpleWhiteboard = super.getSimpleWhiteboardInstance();
    if (!simpleWhiteboard) {
      return null;
    }

    if (!item) {
      return html`
        <p>
          ${msg("Select an item by clicking on it.", {
            id: "tool-pointer-no-item-selected",
          })}
        </p>
      `;
    } else {
      const tool = simpleWhiteboard.getToolInstance(item.kind);
      if (!tool) {
        return null;
      }
      return tool.renderToolOptions(item);
    }
  }
}
