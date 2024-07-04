import { html } from "lit";
import { customElement } from "lit/decorators.js";
import { unsafeHTML } from "lit/directives/unsafe-html.js";

import SimpleWhiteboardTool, {
  BoundingRect,
  RoughCanvas,
  RoughCanvasOptions,
  WhiteboardItem,
} from "../lib/SimpleWhiteboardTool";
import { getIconSvg } from "../lib/icons";

interface RectItem extends WhiteboardItem {
  x: number;
  y: number;
  width: number;
  height: number;
  options: RoughCanvasOptions;
}

@customElement("simple-whiteboard--tool-rect")
export class SimpleWhiteboardToolRect extends SimpleWhiteboardTool {
  public getToolIcon() {
    return html`${unsafeHTML(getIconSvg("square"))}`;
  }

  public getToolName() {
    return "rect";
  }

  public drawItem(
    rc: RoughCanvas,
    _context: CanvasRenderingContext2D,
    item: RectItem
  ): void {
    const simpleWhiteboard = super.getSimpleWhiteboardInstance();
    if (!simpleWhiteboard) {
      return;
    }
    const { x: rectX, y: rectY } = simpleWhiteboard.coordsToCanvasCoords(
      item.x,
      item.y
    );
    rc.rectangle(rectX, rectY, item.width, item.height, item.options);
  }

  public getBoundingRect(item: RectItem): BoundingRect | null {
    return {
      x: item.x,
      y: item.y,
      width: item.width,
      height: item.height,
    };
  }

  public handleDrawingStart(x: number, y: number): void {
    const simpleWhiteboard = super.getSimpleWhiteboardInstance();
    if (!simpleWhiteboard) {
      return;
    }
    const itemId = super.generateId();

    const { x: itemX, y: itemY } = simpleWhiteboard.coordsFromCanvasCoords(
      x,
      y
    );

    const item: RectItem = {
      kind: this.getToolName(),
      id: itemId,
      x: itemX,
      y: itemY,
      width: 0,
      height: 0,
      options: {},
    };

    simpleWhiteboard.setCurrentDrawing(item);
  }

  public handleDrawingMove(x: number, y: number): void {
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

    const rectItem = currentDrawing as RectItem;
    const { x: currentX, y: currentY } = rectItem;

    const { x: canvasX, y: canvasY } = simpleWhiteboard.getCanvasCoords();

    simpleWhiteboard.setCurrentDrawing({
      ...rectItem,
      width: x - currentX - canvasX,
      height: y - currentY - canvasY,
    } as RectItem);
  }
}
