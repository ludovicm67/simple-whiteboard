import { html } from "lit";
import { customElement } from "lit/decorators.js";
import { unsafeHTML } from "lit/directives/unsafe-html.js";

import SimpleWhiteboardTool, {
  WhiteboardItem,
} from "../lib/SimpleWhiteboardTool";
import { getIconSvg } from "../lib/icons";

interface MoveItem extends WhiteboardItem {
  x: number;
  y: number;
}

@customElement("simple-whiteboard--tool-move")
export class SimpleWhiteboardToolMove extends SimpleWhiteboardTool {
  public override getToolIcon() {
    return html`${unsafeHTML(getIconSvg("move"))}`;
  }

  public override getToolName() {
    return "move";
  }

  public override handleDrawingStart(x: number, y: number): void {
    const simpleWhiteboard = super.getSimpleWhiteboardInstance();
    if (!simpleWhiteboard) {
      return;
    }
    const itemId = super.generateId();

    const item: MoveItem = {
      kind: this.getToolName(),
      id: itemId,
      x,
      y,
      options: {},
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

    const moveItem = currentDrawing as MoveItem;
    const { x: startX, y: startY } = moveItem;

    const canvasCoords = simpleWhiteboard.getCanvasCoords();
    const { x: canvasX, y: canvasY } = canvasCoords;

    const moveX = x - startX;
    const moveY = y - startY;

    simpleWhiteboard.setCanvasCoords({
      ...canvasCoords,
      x: canvasX + moveX,
      y: canvasY + moveY,
    });

    simpleWhiteboard.setCurrentDrawing({
      ...moveItem,
      x: x,
      y: y,
    } as MoveItem);
  }

  public override handleDrawingEnd(): void {
    const simpleWhiteboard = super.getSimpleWhiteboardInstance();
    if (!simpleWhiteboard) {
      return;
    }

    simpleWhiteboard.setCurrentDrawing(null);
  }
}
