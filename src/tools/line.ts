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
  private stroke = "#000000";
  private strokeWidth = 2;

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
    const strokeWidth = item.options.strokeWidth || 1;
    const halfStrokeWidth = strokeWidth / 2;
    return {
      x: Math.min(item.x1, item.x2) - halfStrokeWidth,
      y: Math.min(item.y1, item.y2) - halfStrokeWidth,
      width: Math.abs(item.x2 - item.x1) + strokeWidth,
      height: Math.abs(item.y2 - item.y1) + strokeWidth,
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
      options: {
        stroke: this.stroke,
        strokeWidth: this.strokeWidth,
      },
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

  public override onToolSelected(): void {
    const simpleWhiteboard = this.getSimpleWhiteboardInstance();
    if (!simpleWhiteboard) {
      return;
    }
    simpleWhiteboard.setSelectedItemId(null);
  }

  public override getCoordsItem(item: LineItem): { x: number; y: number } {
    return { x: item.x1, y: item.y1 };
  }

  public override setCoordsItem(
    item: LineItem,
    x: number,
    y: number
  ): LineItem {
    const deltaX = x - item.x1;
    const deltaY = y - item.y1;
    return {
      ...item,
      x1: x,
      y1: y,
      x2: item.x2 + deltaX,
      y2: item.y2 + deltaY,
    };
  }

  public override renderToolOptions(item: LineItem | null) {
    const simpleWhiteboard = super.getSimpleWhiteboardInstance();
    if (!simpleWhiteboard) {
      return null;
    }

    // Case: no item selected = new item
    if (!item) {
      return html`
        <p>Stroke:</p>
        <input
          type="color"
          .value=${this.stroke}
          @input=${(e: Event) => {
            const target = e.target as HTMLInputElement;
            this.stroke = target.value;
          }}
        />
        <p>Stroke width:</p>
        <input
          type="range"
          min="1"
          max="50"
          .value=${this.strokeWidth}
          @input=${(e: Event) => {
            const target = e.target as HTMLInputElement;
            this.strokeWidth = parseInt(target.value, 10);
          }}
        />
      `;
    }

    // Case: item selected
    return html`
      <p>Stroke:</p>
      <input
        type="color"
        .value=${item.options.stroke}
        @input=${(e: Event) => {
          const target = e.target as HTMLInputElement;
          simpleWhiteboard.updateItemById(
            item.id,
            {
              ...item,
              options: {
                ...item.options,
                stroke: target.value,
              },
            },
            true
          );
        }}
      />
      <p>Stroke width:</p>
      <input
        type="range"
        min="1"
        max="50"
        .value=${item.options.strokeWidth}
        @input=${(e: Event) => {
          const target = e.target as HTMLInputElement;
          simpleWhiteboard.updateItemById(
            item.id,
            {
              ...item,
              options: {
                ...item.options,
                strokeWidth: parseInt(target.value, 10),
              },
            },
            true
          );
        }}
      />
      <button
        @click=${() => {
          simpleWhiteboard.removeItemById(item.id, true);
        }}
      >
        Delete
      </button>
    `;
  }
}
