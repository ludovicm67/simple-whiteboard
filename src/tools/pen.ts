import { html } from "lit";
import { customElement } from "lit/decorators.js";
import { unsafeHTML } from "lit/directives/unsafe-html.js";

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
export class SimpleWhiteboardToolPen extends SimpleWhiteboardTool {
  private size = 6;
  private smoothing = 0.5;
  private thinning = 0.5;
  private streamline = 0.5;
  private color = "#000000";

  public override getToolIcon() {
    return html`${unsafeHTML(getIconSvg("edit-2"))}`;
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
    const outlinePoints = getStroke(
      item.path.map((p) => {
        const { x, y } = simpleWhiteboard.coordsToCanvasCoords(p.x, p.y);
        return { x, y };
      }),
      {
        size: item.options.size || 6,
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
    return {
      x: Math.min(...item.path.map((p) => p.x)),
      y: Math.min(...item.path.map((p) => p.y)),
      width:
        Math.max(...item.path.map((p) => p.x)) -
        Math.min(...item.path.map((p) => p.x)),
      height:
        Math.max(...item.path.map((p) => p.y)) -
        Math.min(...item.path.map((p) => p.y)),
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

  public override onToolSelected(): void {
    const simpleWhiteboard = this.getSimpleWhiteboardInstance();
    if (!simpleWhiteboard) {
      return;
    }
    simpleWhiteboard.setSelectedItemId(null);
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
          <p>Size:</p>
          <input
            type="range"
            min="1"
            max="50"
            .value=${this.size}
            @input=${(e: Event) => {
              const target = e.target as HTMLInputElement;
              this.size = Number(target.value);
            }}
          />
        </div>
        <div>
          <p>Color:</p>
          <input
            type="color"
            .value=${this.color}
            @input=${(e: Event) => {
              const target = e.target as HTMLInputElement;
              this.color = target.value;
            }}
          />
        </div>
      `;
    }

    // Case: item selected
    return html`
      <div>
        <p>Size:</p>
        <input
          type="range"
          min="1"
          max="50"
          .value=${item.options.size}
          @input=${(e: Event) => {
            const target = e.target as HTMLInputElement;
            simpleWhiteboard.updateItemById(
              item.id,
              {
                ...item,
                options: {
                  ...item.options,
                  size: target.value,
                },
              },
              true
            );
          }}
        />
      </div>
      <div>
        <p>Color:</p>
        <input
          type="color"
          .value=${item.options.color}
          @input=${(e: Event) => {
            const target = e.target as HTMLInputElement;
            simpleWhiteboard.updateItemById(
              item.id,
              {
                ...item,
                options: {
                  ...item.options,
                  color: target.value,
                },
              },
              true
            );
          }}
        />
      </div>
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
