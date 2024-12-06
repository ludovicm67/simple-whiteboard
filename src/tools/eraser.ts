import { html } from "lit";
import { customElement } from "lit/decorators.js";
import { unsafeHTML } from "lit/directives/unsafe-html.js";

import "../components/colorSelect";
import SimpleWhiteboardTool, {
  BoundingRect,
  RoughCanvas,
  WhiteboardItem,
} from "../lib/SimpleWhiteboardTool";
import { getIconSvg } from "../lib/icons";
import { getSvgPathFromStroke } from "../lib/svg";
import getStroke from "perfect-freehand";

interface EraserItem extends WhiteboardItem {
  path: { x: number; y: number }[];
  options: {
    color?: string;
    size?: number;
    smoothing?: number;
    thinning?: number;
    streamline?: number;
  };
}

@customElement("simple-whiteboard--tool-eraser")
export class SimpleWhiteboardToolEraser extends SimpleWhiteboardTool {
  private size = 25;
  private smoothing = 0.5;
  private thinning = 0.5;
  private streamline = 0.5;
  private color = "#fcfcff";

  public override getToolIcon() {
    return html`${unsafeHTML(getIconSvg("tablet"))}`;
  }

  public override getToolName() {
    return "eraser";
  }

  public override drawItem(
    _rc: RoughCanvas,
    context: CanvasRenderingContext2D,
    item: EraserItem
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
        size: (item.options.size || 25) * zoom,
        smoothing: item.options.smoothing || 0.5,
        thinning: item.options.thinning || 0.5,
        streamline: item.options.streamline || 0.5,
      }
    );
    const pathData = getSvgPathFromStroke(outlinePoints);

    const path = new Path2D(pathData);
    const prevFillStyle = context.fillStyle;
    context.fillStyle = this.color;
    context.fill(path);
    context.fillStyle = prevFillStyle;
  }

  public override getBoundingRect(item: EraserItem): BoundingRect | null {
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

    const item: EraserItem = {
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

    const eraserItem = currentDrawing as EraserItem;
    eraserItem.path.push(simpleWhiteboard.coordsFromCanvasCoords(x, y));

    simpleWhiteboard.setCurrentDrawing(eraserItem);
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

    const item = currentDrawing as EraserItem;
    simpleWhiteboard.addItem(item, true);
    simpleWhiteboard.setCurrentDrawing(null);
  }

  public override getCoordsItem(item: EraserItem): { x: number; y: number } {
    const firstPoint = item.path[0];
    return { x: firstPoint.x, y: firstPoint.y };
  }

  public override setCoordsItem(
    item: EraserItem,
    x: number,
    y: number
  ): EraserItem {
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

  public override renderToolOptions(item: EraserItem | null) {
    const simpleWhiteboard = super.getSimpleWhiteboardInstance();
    if (!simpleWhiteboard) {
      return null;
    }

    // Case: no item selected = new item
    if (!item) {
      return html`
        <div>
          <p>Size:</p>
          <input
            class="width-100-percent"
            type="range"
            min="1"
            max="161"
            step="8"
            .value=${this.size}
            @input=${(e: Event) => {
              const target = e.target as HTMLInputElement;
              this.size = parseInt(target.value, 10);
            }}
          />
        </div>
      `;
    }

    // Case: item selected
    return html`
      <p>Size:</p>
      <input
        class="width-100-percent"
        type="range"
        min="1"
        max="161"
        step="8"
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
