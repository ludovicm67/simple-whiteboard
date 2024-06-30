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

interface CircleItem extends WhiteboardItem {
  x: number;
  y: number;
  diameter: number;
  options: RoughCanvasOptions;
}

@customElement("simple-whiteboard--tool-circle")
export class SimpleWhiteboardToolCircle extends SimpleWhiteboardTool {
  public getToolIcon() {
    return html`${unsafeHTML(getIconSvg("circle"))}`;
  }

  public getToolName() {
    return "circle";
  }

  public drawItem(
    rc: RoughCanvas,
    _context: CanvasRenderingContext2D,
    item: CircleItem
  ): void {
    const simpleWhiteboard = super.getSimpleWhiteboardInstance();
    if (!simpleWhiteboard) {
      return;
    }
    const { x: circleX, y: circleY } = simpleWhiteboard.coordsToCanvasCoords(
      item.x,
      item.y
    );
    rc.circle(circleX, circleY, item.diameter, item.options);
  }

  public getBoundingRect(item: CircleItem): BoundingRect | null {
    return {
      x: item.x - item.diameter / 2,
      y: item.y - item.diameter / 2,
      width: item.diameter,
      height: item.diameter,
    };
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

    const circleItem = currentDrawing as CircleItem;
    const { x: x1, y: y1 } = circleItem;

    const { x: canvasX, y: canvasY } = simpleWhiteboard.getCanvasCoords();

    const x2 = x - canvasX;
    const y2 = y - canvasY;
    const dx = x2 - x1;
    const dy = y2 - y1;

    simpleWhiteboard.setCurrentDrawing({
      ...circleItem,
      diameter: Math.sqrt(dx * dx + dy * dy) * 2,
    } as CircleItem);
  }
}
