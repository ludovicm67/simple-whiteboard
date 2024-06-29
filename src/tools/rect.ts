import { html } from "lit";
import { customElement } from "lit/decorators.js";
import { unsafeHTML } from "lit/directives/unsafe-html.js";

import SimpleWhiteboardTool, {
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
}
