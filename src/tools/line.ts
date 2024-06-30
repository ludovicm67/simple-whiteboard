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
  public getToolIcon() {
    return html`${unsafeHTML(getIconSvg("minus"))}`;
  }

  public getToolName() {
    return "line";
  }

  public drawItem(
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

  public getBoundingRect(item: LineItem): BoundingRect | null {
    return {
      x: Math.min(item.x1, item.x2),
      y: Math.min(item.y1, item.y2),
      width: Math.abs(item.x2 - item.x1),
      height: Math.abs(item.y2 - item.y1),
    };
  }
}
