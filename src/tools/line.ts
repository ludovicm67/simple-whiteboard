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

interface LineItem extends WhiteboardItem {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  options: RoughCanvasOptions;
}

@customElement("simple-whiteboard--tool-line")
export class SimpleWhiteboardToolLine extends SimpleWhiteboardTool {
  public override getToolIcon() {
    return html`${unsafeHTML(getIconSvg("minus"))}`;
  }

  public override getToolName() {
    return "line";
  }

  public override drawItem(
    rc: RoughCanvas,
    _context: CanvasRenderingContext2D,
    item: LineItem
  ) {
    const simpleWhiteboard = super.getSimpleWhiteboardInstance();
    if (!simpleWhiteboard) {
      return;
    }
    const { x: x1, y: y1 } = simpleWhiteboard.coordsToCanvasCoords(
      item.x1,
      item.y1
    );
    const { x: x2, y: y2 } = simpleWhiteboard.coordsToCanvasCoords(
      item.x2,
      item.y2
    );
    rc.line(x1, y1, x2, y2, item.options);
  }

  public override getBoundingRect(item: LineItem): BoundingRect | null {
    return {
      x: Math.min(item.x1, item.x2),
      y: Math.min(item.y1, item.y2),
      width: Math.abs(item.x2 - item.x1),
      height: Math.abs(item.y2 - item.y1),
    };
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

    const item: LineItem = {
      kind: this.getToolName(),
      id: itemId,
      x1: itemX,
      y1: itemY,
      x2: itemX,
      y2: itemY,
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

    const lineItem = currentDrawing as LineItem;

    const { x: canvasX, y: canvasY } = simpleWhiteboard.getCanvasCoords();

    simpleWhiteboard.setCurrentDrawing({
      ...lineItem,
      x2: x - canvasX,
      y2: y - canvasY,
    } as LineItem);
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

    const item = currentDrawing as LineItem;
    simpleWhiteboard.addItem(item, true);
    simpleWhiteboard.setCurrentDrawing(null);
  }
}
