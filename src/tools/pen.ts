import { html } from "lit";
import { customElement } from "lit/decorators.js";
import { unsafeHTML } from "lit/directives/unsafe-html.js";

import SimpleWhiteboardTool, {
  BoundingRect,
  RoughCanvas,
  WhiteboardItem,
} from "../lib/SimpleWhiteboardTool";
import { getIconSvg } from "../lib/icons";
import { getSvgPathFromStroke } from "../lib/svg";
import getStroke from "perfect-freehand";

interface PenItem extends WhiteboardItem {
  path: { x: number; y: number }[];
  options: {
    color?: string;
  };
}

@customElement("simple-whiteboard--tool-pen")
export class SimpleWhiteboardToolPen extends SimpleWhiteboardTool {
  public getToolIcon() {
    return html`${unsafeHTML(getIconSvg("edit-2"))}`;
  }

  public getToolName() {
    return "pen";
  }

  public drawItem(
    _rc: RoughCanvas,
    context: CanvasRenderingContext2D,
    item: PenItem
  ): void {
    const simpleWhiteboard = super.getSimpleWhiteboardInstance();
    if (!simpleWhiteboard) {
      return;
    }
    const outlinePoints = getStroke(
      item.path.map((p) => {
        const { x, y } = simpleWhiteboard.coordsToCanvasCoords(p.x, p.y);
        return { x, y };
      }),
      {
        size: 6,
        smoothing: 0.5,
        thinning: 0.5,
        streamline: 0.5,
      }
    );
    const pathData = getSvgPathFromStroke(outlinePoints);

    const path = new Path2D(pathData);
    const prevFillStyle = context.fillStyle;
    context.fillStyle = item.options.color || "black";
    context.fill(path);
    context.fillStyle = prevFillStyle;
  }

  public getBoundingRect(item: PenItem): BoundingRect | null {
    return {
      x: Math.min(...item.path.map((p) => p.x)),
      y: Math.min(...item.path.map((p) => p.y)),
      width:
        Math.max(...item.path.map((p) => p.x)) -
        Math.min(...item.path.map((p) => p.x)),
      height:
        Math.max(...item.path.map((p) => p.y)) -
        Math.min(...item.path.map((p) => p.y)),
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

    const item: PenItem = {
      kind: this.getToolName(),
      id: itemId,
      path: [{ x: itemX, y: itemY }],
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

    const penItem = currentDrawing as PenItem;
    penItem.path.push(simpleWhiteboard.coordsFromCanvasCoords(x, y));

    simpleWhiteboard.setCurrentDrawing(penItem);
  }
}
