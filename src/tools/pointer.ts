import { TemplateResult, html } from "lit";
import { customElement } from "lit/decorators.js";
import { unsafeHTML } from "lit/directives/unsafe-html.js";

import SimpleWhiteboardTool, {
  WhiteboardItem,
} from "../lib/SimpleWhiteboardTool";
import { getIconSvg } from "../lib/icons";

interface PointerItem extends WhiteboardItem {
  x: number;
  y: number;
}

@customElement("simple-whiteboard--tool-pointer")
export class SimpleWhiteboardToolPointer extends SimpleWhiteboardTool {
  public override getToolIcon() {
    return html`${unsafeHTML(getIconSvg("mouse-pointer"))}`;
  }

  public override getToolName() {
    return "pointer";
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

    const item: PointerItem = {
      kind: this.getToolName(),
      id: itemId,
      x: itemX,
      y: itemY,
      options: {},
    };

    simpleWhiteboard.setCurrentDrawing(item);
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

    const { x: pointerX, y: pointerY } = currentDrawing as PointerItem;

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
      const { x, y, width, height } = boundingRect;
      return (
        pointerX > x &&
        pointerX < x + width &&
        pointerY > y &&
        pointerY < y + height
      );
    });
    if (potentialItems.length > 0) {
      simpleWhiteboard.setSelectedItemId(potentialItems[0].id);
    } else {
      simpleWhiteboard.setSelectedItemId(null);
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
      return html` <p>Select an item by clicking on it.</p> `;
    } else {
      const tool = simpleWhiteboard.getToolInstance(item.kind);
      if (!tool) {
        return null;
      }
      return tool.renderToolOptions(item);
    }
  }
}
