import { html } from "lit";
import { customElement } from "lit/decorators.js";
import { unsafeHTML } from "lit/directives/unsafe-html.js";
import { localized, msg } from "@lit/localize";

import "../components/colorSelect";
import SimpleWhiteboardTool, {
  BoundingRect,
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
    size?: number;
    smoothing?: number;
    thinning?: number;
    streamline?: number;
  };
}

@customElement("simple-whiteboard--tool-pen")
@localized()
export class SimpleWhiteboardToolPen extends SimpleWhiteboardTool {
  private size = 6;
  private smoothing = 0.5;
  private thinning = 0.5;
  private streamline = 0.5;
  private color = "#000000";

  public override getToolIcon() {
    return html`${unsafeHTML(getIconSvg("Edit2"))}`;
  }

  public override getToolName() {
    return "pen";
  }

  public override drawItem(
    _rc: RoughCanvas,
    context: CanvasRenderingContext2D,
    item: PenItem
  ): void {
    const simpleWhiteboard = super.getSimpleWhiteboardInstance();
    if (!simpleWhiteboard) {
      return;
    }
    const { zoom } = simpleWhiteboard.getCanvasCoords();
    const outlinePoints = getStroke(
      item.path.map((p) => {
        const { x, y } = simpleWhiteboard.coordsToCanvasCoords(p.x, p.y);
        return { x, y };
      }),
      {
        size: (item.options.size || 8) * zoom,
        smoothing: item.options.smoothing || 0.5,
        thinning: item.options.thinning || 0.5,
        streamline: item.options.streamline || 0.5,
      }
    );
    const pathData = getSvgPathFromStroke(outlinePoints);

    const path = new Path2D(pathData);
    const prevFillStyle = context.fillStyle;
    context.fillStyle = item.options.color || "#000000";
    context.fill(path);
    context.fillStyle = prevFillStyle;
  }

  public override getBoundingRect(item: PenItem): BoundingRect | null {
    const strokeWidth = item.options.size || 1;
    const halfStrokeWidth = strokeWidth / 2;

    const maxX = Math.max(...item.path.map((p) => p.x));
    const minX = Math.min(...item.path.map((p) => p.x));
    const maxY = Math.max(...item.path.map((p) => p.y));
    const minY = Math.min(...item.path.map((p) => p.y));

    return {
      x: minX - halfStrokeWidth,
      y: minY - halfStrokeWidth,
      width: maxX - minX + strokeWidth,
      height: maxY - minY + strokeWidth,
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

    const item: PenItem = {
      kind: this.getToolName(),
      id: itemId,
      path: [{ x: itemX, y: itemY }],
      options: {
        color: this.color,
        size: this.size,
        smoothing: this.smoothing,
        thinning: this.thinning,
        streamline: this.streamline,
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

    const penItem = currentDrawing as PenItem;
    penItem.path.push(simpleWhiteboard.coordsFromCanvasCoords(x, y));

    simpleWhiteboard.setCurrentDrawing(penItem);
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

    const item = currentDrawing as PenItem;
    simpleWhiteboard.addItem(item, true);
    simpleWhiteboard.setCurrentDrawing(null);
  }

  public override getCoordsItem(item: PenItem): { x: number; y: number } {
    const firstPoint = item.path[0];
    return { x: firstPoint.x, y: firstPoint.y };
  }

  public override setCoordsItem(item: PenItem, x: number, y: number): PenItem {
    const firstPoint = item.path[0];
    const deltaX = x - firstPoint.x;
    const deltaY = y - firstPoint.y;
    return {
      ...item,
      path: item.path.map((p) => {
        return {
          x: p.x + deltaX,
          y: p.y + deltaY,
        };
      }),
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

  public override renderToolOptions(item: PenItem | null) {
    const simpleWhiteboard = super.getSimpleWhiteboardInstance();
    if (!simpleWhiteboard) {
      return null;
    }

    // Case: no item selected = new item
    if (!item) {
      return html`
        <div>
          <p>${msg("Size:", { id: "tool-options-size" })}</p>
          <input
            class="width-100-percent"
            type="range"
            min="1"
            max="50"
            step="7"
            .value=${this.size}
            @input=${(e: Event) => {
              const target = e.target as HTMLInputElement;
              this.size = parseInt(target.value, 10);
            }}
          />
          <p>${msg("Color:", { id: "tool-options-color" })}</p>
          ${this.generateColorSelect(
            ["#000000", "#ff1a40", "#29b312", "#135aa0", "#fc8653"],
            this.color,
            (color) => {
              this.color = color;
            }
          )}
        </div>
      `;
    }

    // Case: item selected
    return html`
      <p>${msg("Size:", { id: "tool-options-size" })}</p>
      <input
        class="width-100-percent"
        type="range"
        min="1"
        max="50"
        step="7"
        .value=${item.options.size}
        @input=${(e: Event) => {
          const target = e.target as HTMLInputElement;
          simpleWhiteboard.updateItemById(
            item.id,
            {
              ...item,
              options: {
                ...item.options,
                size: parseInt(target.value, 10),
              },
            },
            true
          );
        }}
      />
      <p>${msg("Color:", { id: "tool-options-color" })}</p>
      ${this.generateColorSelect(
        ["#000000", "#ff1a40", "#29b312", "#135aa0", "#fc8653"],
        this.color,
        (color) => {
          this.color = color;
          simpleWhiteboard.updateItemById(
            item.id,
            {
              ...item,
              options: {
                ...item.options,
                color: color,
              },
            },
            true
          );
        }
      )}
      <button
        class="button width-100-percent"
        @click=${() => {
          simpleWhiteboard.removeItemById(item.id, true);
        }}
      >
        ${msg("Delete", { id: "tool-options-delete" })}
      </button>
    `;
  }
}
