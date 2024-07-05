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

interface RectItem extends WhiteboardItem {
  x: number;
  y: number;
  width: number;
  height: number;
  options: RoughCanvasOptions;
}

@customElement("simple-whiteboard--tool-rect")
export class SimpleWhiteboardToolRect extends SimpleWhiteboardTool {
  private stroke = "#000000";
  private strokeWidth = 2;
  private fill = "#000000";

  public override getToolIcon() {
    return html`${unsafeHTML(getIconSvg("square"))}`;
  }

  public override getToolName() {
    return "rect";
  }

  public override drawItem(
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

  public override getBoundingRect(item: RectItem): BoundingRect | null {
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

    const item: RectItem = {
      kind: this.getToolName(),
      id: itemId,
      x: itemX,
      y: itemY,
      width: 0,
      height: 0,
      options: {
        stroke: this.stroke,
        strokeWidth: this.strokeWidth,
        fill: this.fill,
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

    const rectItem = currentDrawing as RectItem;
    const { x: currentX, y: currentY } = rectItem;

    const { x: canvasX, y: canvasY } = simpleWhiteboard.getCanvasCoords();

    simpleWhiteboard.setCurrentDrawing({
      ...rectItem,
      width: x - currentX - canvasX,
      height: y - currentY - canvasY,
    } as RectItem);
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

    const item = currentDrawing as RectItem;
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

  public override renderToolOptions(item: RectItem | null) {
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
          type="number"
          .value=${this.strokeWidth}
          @input=${(e: Event) => {
            const target = e.target as HTMLInputElement;
            this.strokeWidth = parseInt(target.value, 10);
          }}
        />
        <p>Fill:</p>
        <input
          type="checkbox"
          .checked=${this.fill !== "transparent"}
          @change=${(e: Event) => {
            const target = e.target as HTMLInputElement;
            this.fill = target.checked
              ? this.fill === "transparent"
                ? "#000000"
                : this.fill
              : "transparent";
          }}
        />
        <input
          type="color"
          .value=${this.fill}
          @input=${(e: Event) => {
            const target = e.target as HTMLInputElement;
            this.fill = target.value;
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
        type="number"
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
      <p>Fill:</p>
      <input
        type="checkbox"
        .checked=${item.options.fill !== "transparent"}
        @change=${(e: Event) => {
          const target = e.target as HTMLInputElement;
          simpleWhiteboard.updateItemById(
            item.id,
            {
              ...item,
              options: {
                ...item.options,
                fill: target.checked
                  ? this.fill === "transparent"
                    ? "#000000"
                    : this.fill
                  : "transparent",
              },
            },
            true
          );
        }}
      />
      <input
        type="color"
        .value=${item.options.fill}
        @input=${(e: Event) => {
          const target = e.target as HTMLInputElement;
          simpleWhiteboard.updateItemById(
            item.id,
            {
              ...item,
              options: {
                ...item.options,
                fill: target.value,
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
