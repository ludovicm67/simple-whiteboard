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
  private stroke = "#000000";
  private strokeWidth = 2;
  private fill = "transparent";

  public override getToolIcon() {
    return html`${unsafeHTML(getIconSvg("circle"))}`;
  }

  public override getToolName() {
    return "circle";
  }

  public override drawItem(
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

  public override getBoundingRect(item: CircleItem): BoundingRect | null {
    const strokeWidth = item.options.strokeWidth || 1;
    const halfStrokeWidth = strokeWidth / 2;
    return {
      x: item.x - item.diameter / 2 - halfStrokeWidth,
      y: item.y - item.diameter / 2 - halfStrokeWidth,
      width: item.diameter + strokeWidth,
      height: item.diameter + strokeWidth,
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

    const item: CircleItem = {
      kind: this.getToolName(),
      id: itemId,
      x: itemX,
      y: itemY,
      diameter: 0,
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

    const item = currentDrawing as CircleItem;
    simpleWhiteboard.addItem(item, true);
    simpleWhiteboard.setCurrentDrawing(null);
  }

  public override getCoordsItem(item: CircleItem): { x: number; y: number } {
    return { x: item.x, y: item.y };
  }

  public override setCoordsItem(
    item: CircleItem,
    x: number,
    y: number
  ): CircleItem {
    return {
      ...item,
      x,
      y,
    };
  }

  public override onToolSelected(): void {
    const simpleWhiteboard = this.getSimpleWhiteboardInstance();
    if (!simpleWhiteboard) {
      return;
    }
    simpleWhiteboard.setSelectedItemId(null);
  }

  public override renderToolOptions(item: CircleItem | null) {
    const simpleWhiteboard = super.getSimpleWhiteboardInstance();
    if (!simpleWhiteboard) {
      return null;
    }

    // Case: no item selected = new item
    if (!item) {
      return html`
        <p>Stroke width:</p>
        <input
          class="width-100-percent"
          type="range"
          min="1"
          max="50"
          .value=${this.strokeWidth}
          @input=${(e: Event) => {
            const target = e.target as HTMLInputElement;
            this.strokeWidth = parseInt(target.value, 10);
          }}
        />
        <p>Stroke:</p>
        <input
          class="width-100-percent"
          type="color"
          .value=${this.stroke}
          @input=${(e: Event) => {
            const target = e.target as HTMLInputElement;
            this.stroke = target.value;
          }}
        />
        <p>Fill:</p>
        <input
          class="width-100-percent"
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
          class="width-100-percent"
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
      <p>Stroke width:</p>
      <input
        class="width-100-percent"
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
      <p>Stroke:</p>
      <input
        class="width-100-percent"
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
      <p>Fill:</p>
      <input
        class="width-100-percent"
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
        class="width-100-percent"
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
        class="width-100-percent"
        @click=${() => {
          simpleWhiteboard.removeItemById(item.id, true);
        }}
      >
        Delete
      </button>
    `;
  }
}
