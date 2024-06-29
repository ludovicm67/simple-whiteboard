import { html } from "lit";
import { customElement } from "lit/decorators.js";
import { unsafeHTML } from "lit/directives/unsafe-html.js";

import SimpleWhiteboardTool, {
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
}
