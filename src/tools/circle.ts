import { html } from "lit";
import { customElement } from "lit/decorators.js";
import { unsafeHTML } from "lit/directives/unsafe-html.js";

import SimpleWhiteboardTool, {
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
}
