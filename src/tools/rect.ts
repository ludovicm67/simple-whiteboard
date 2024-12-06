import { html } from "lit";
import { customElement } from "lit/decorators.js";
import { unsafeHTML } from "lit/directives/unsafe-html.js";

import "../components/colorSelect";
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
  private strokeWidth = 1;
  private fill = "transparent";

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
    const { zoom } = simpleWhiteboard.getCanvasCoords();
    const { x: rectX, y: rectY } = simpleWhiteboard.coordsToCanvasCoords(
      item.x,
      item.y
    );
    rc.rectangle(rectX, rectY, item.width, item.height, {
      ...item.options,
      strokeWidth: item.options.strokeWidth
        ? item.options.strokeWidth * zoom
        : undefined,
    });
  }

  public override getBoundingRect(item: RectItem): BoundingRect | null {
    const strokeWidth = item.options.strokeWidth || 1;
    const halfStrokeWidth = strokeWidth / 2;
    return {
      x: item.x - halfStrokeWidth,
      y: item.y - halfStrokeWidth,
      width: item.width + strokeWidth,
      height: item.height + strokeWidth,
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

    const { zoom } = simpleWhiteboard.getCanvasCoords();
    const { x: canvasX, y: canvasY } = simpleWhiteboard.coordsFromCanvasCoords(
      x,
      y
    );

    simpleWhiteboard.setCurrentDrawing({
      ...rectItem,
      width: (canvasX - currentX) * zoom,
      height: (canvasY - currentY) * zoom,
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

  public override getCoordsItem(item: RectItem): { x: number; y: number } {
    return { x: item.x, y: item.y };
  }

  public override setCoordsItem(
    item: RectItem,
    x: number,
    y: number
  ): RectItem {
    return {
      ...item,
      x,
      y,
    };
  }

  generateColorSelect(
    colors: string[],
    currentColor: string,
    clickCallback: (color: string) => void
  ) {
    return colors.map((color) => {
      return html`<color-select
        color=${color}
        .selected=${currentColor === color}
        @color-click=${(e: CustomEvent) => {
          clickCallback(e.detail.color);
        }}
      ></color-select>`;
    });
  }

  public override renderToolOptions(item: RectItem | null) {
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
          step="7"
          .value=${this.strokeWidth}
          @input=${(e: Event) => {
            const target = e.target as HTMLInputElement;
            this.strokeWidth = parseInt(target.value, 10);
          }}
        />
        <p>Stroke:</p>
        ${this.generateColorSelect(
          ["#000000", "#ff1a40", "#29b312", "#135aa0", "#fc8653"],
          this.stroke,
          (color) => {
            this.stroke = color;
          }
        )}
        <p>Fill:</p>
        ${this.generateColorSelect(
          ["transparent", "#ff8dad", "#9bff8c", "#8fddff", "#ffc7a9"],
          this.fill,
          (color) => {
            this.fill = color;
          }
        )}
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
        step="7"
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
      ${this.generateColorSelect(
        ["#000000", "#ff1a40", "#29b312", "#135aa0", "#fc8653"],
        this.stroke,
        (color) => {
          this.stroke = color;
          simpleWhiteboard.updateItemById(
            item.id,
            {
              ...item,
              options: {
                ...item.options,
                stroke: color,
              },
            },
            true
          );
        }
      )}
      <p>Fill:</p>
      ${this.generateColorSelect(
        ["transparent", "#ff8dad", "#9bff8c", "#8fddff", "#ffc7a9"],
        this.fill,
        (color) => {
          this.fill = color;
          simpleWhiteboard.updateItemById(
            item.id,
            {
              ...item,
              options: {
                ...item.options,
                fill: color,
              },
            },
            true
          );
        }
      )}
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
