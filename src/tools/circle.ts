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

interface CircleItem extends WhiteboardItem {
  x: number;
  y: number;
  diameter: number;
  options: RoughCanvasOptions;
}

@customElement("simple-whiteboard--tool-circle")
export class SimpleWhiteboardToolCircle extends SimpleWhiteboardTool {
  private stroke = "#000000";
  private strokeWidth = 1;
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
    const { zoom } = simpleWhiteboard.getCanvasCoords();
    const { x: circleX, y: circleY } = simpleWhiteboard.coordsToCanvasCoords(
      item.x,
      item.y
    );
    rc.circle(circleX, circleY, item.diameter * zoom, {
      ...item.options,
      strokeWidth: item.options.strokeWidth
        ? item.options.strokeWidth * zoom
        : undefined,
    });
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

    const { x: canvasX, y: canvasY } = simpleWhiteboard.coordsFromCanvasCoords(
      x,
      y
    );
    const dx = canvasX - x1;
    const dy = canvasY - y1;

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
