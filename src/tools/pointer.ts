import { html } from "lit";
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
  public getToolIcon() {
    return html`${unsafeHTML(getIconSvg("mouse-pointer"))}`;
  }

  public getToolName() {
    return "pointer";
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

    const item: PointerItem = {
      kind: this.getToolName(),
      id: itemId,
      x: itemX,
      y: itemY,
      options: {},
    };

    simpleWhiteboard.setCurrentDrawing(item);
  }
}
