import { html } from "lit";
import { customElement } from "lit/decorators.js";
import { unsafeHTML } from "lit/directives/unsafe-html.js";

import SimpleWhiteboardTool, {
  BoundingRect,
  RoughCanvas,
  WhiteboardItem,
} from "../lib/SimpleWhiteboardTool";
import { getIconSvg } from "../lib/icons";

interface PictureItem extends WhiteboardItem {
  x: number;
  y: number;
  width: number;
  height: number;
  src: string;
}

@customElement("simple-whiteboard--tool-picture")
export class SimpleWhiteboardToolPicture extends SimpleWhiteboardTool {
  private pictureCache: Map<string, HTMLImageElement> = new Map();

  public override getToolIcon() {
    return html`${unsafeHTML(getIconSvg("image"))}`;
  }

  public override getToolName() {
    return "picture";
  }

  public override drawItem(
    _rc: RoughCanvas,
    context: CanvasRenderingContext2D,
    item: PictureItem
  ): void {
    const simpleWhiteboard = super.getSimpleWhiteboardInstance();
    if (!simpleWhiteboard) {
      return;
    }
    const { x: pictureX, y: pictureY } = simpleWhiteboard.coordsToCanvasCoords(
      item.x,
      item.y
    );
    const cachedImage = this.pictureCache.get(item.src);
    if (cachedImage) {
      context.drawImage(
        cachedImage,
        pictureX,
        pictureY,
        item.width,
        item.height
      );
    } else {
      const img = new Image();
      img.onload = () => {
        this.pictureCache.set(item.src, img);
        context.drawImage(img, pictureX, pictureY, item.width, item.height);
      };
      img.src = item.src;
    }
  }

  public override getBoundingRect(item: PictureItem): BoundingRect | null {
    return {
      x: item.x,
      y: item.y,
      width: item.width,
      height: item.height,
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

    const item: PictureItem = {
      kind: this.getToolName(),
      id: itemId,
      x: itemX,
      y: itemY,
      width: 0,
      height: 0,
      src: "",
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

    const rectItem = currentDrawing as PictureItem;
    const { x: currentX, y: currentY } = rectItem;

    const { x: canvasX, y: canvasY } = simpleWhiteboard.getCanvasCoords();

    simpleWhiteboard.setCurrentDrawing({
      ...rectItem,
      width: x - currentX - canvasX,
      height: y - currentY - canvasY,
    } as PictureItem);
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

    const item = currentDrawing as PictureItem;
    simpleWhiteboard.addItem(item, true);
    simpleWhiteboard.setCurrentDrawing(null);
  }
}
