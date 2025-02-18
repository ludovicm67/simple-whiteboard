import { html } from "lit";
import { customElement } from "lit/decorators.js";
import { unsafeHTML } from "lit/directives/unsafe-html.js";
import { localized, msg } from "@lit/localize";

import "../components/colorSelect";
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
@localized()
export class SimpleWhiteboardToolLine extends SimpleWhiteboardTool {
  private stroke = "#000000";
  private strokeWidth = 1;

  public override getToolIcon() {
    return html`${unsafeHTML(getIconSvg("Minus"))}`;
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
    const { zoom } = simpleWhiteboard.getCanvasCoords();
    const { x: x1, y: y1 } = simpleWhiteboard.coordsToCanvasCoords(
      item.x1,
      item.y1
    );
    const { x: x2, y: y2 } = simpleWhiteboard.coordsToCanvasCoords(
      item.x2,
      item.y2
    );
    rc.line(x1, y1, x2, y2, {
      ...item.options,
      strokeWidth: item.options.strokeWidth
        ? item.options.strokeWidth * zoom
        : undefined,
    });
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

    const { x: canvasX, y: canvasY } = simpleWhiteboard.coordsFromCanvasCoords(
      x,
      y
    );

    simpleWhiteboard.setCurrentDrawing({
      ...lineItem,
      x2: canvasX,
      y2: canvasY,
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

  public override renderToolOptions(item: LineItem | null) {
    const simpleWhiteboard = super.getSimpleWhiteboardInstance();
    if (!simpleWhiteboard) {
      return null;
    }

    // Case: no item selected = new item
    if (!item) {
      return html`
        <p>${msg("Stroke width:", { id: "tool-options-stroke-width" })}</p>
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
        <p>${msg("Stroke:", { id: "tool-options-stroke" })}</p>
        ${this.generateColorSelect(
          ["#000000", "#ff1a40", "#29b312", "#135aa0", "#fc8653"],
          this.stroke,
          (color) => {
            this.stroke = color;
          }
        )}
      `;
    }

    // Case: item selected
    return html`
      <p>${msg("Stroke width:", { id: "tool-options-stroke-width" })}</p>
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
      <p>${msg("Stroke:", { id: "tool-options-stroke" })}</p>
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
      <button
        class="width-100-percent"
        @click=${() => {
          simpleWhiteboard.removeItemById(item.id, true);
        }}
      >
        ${msg("Delete", { id: "tool-options-delete" })}
      </button>
    `;
  }
}
