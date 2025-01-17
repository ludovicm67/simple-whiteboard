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

interface TextItem extends WhiteboardItem {
  x: number;
  y: number;
  width: number;
  height: number;
  text: string;
  options: {
    fontSize: number;
    fontFamily: string;
    color: string;
  };
}

@customElement("simple-whiteboard--tool-text")
@localized()
export class SimpleWhiteboardToolPicture extends SimpleWhiteboardTool {
  private ctx: CanvasRenderingContext2D | null = null;
  private color = "#000000";

  public override getToolIcon() {
    return html`${unsafeHTML(getIconSvg("type"))}`;
  }

  public override getToolName() {
    return "text";
  }

  public override drawItem(
    _rc: RoughCanvas,
    context: CanvasRenderingContext2D,
    item: TextItem
  ): void {
    const simpleWhiteboard = super.getSimpleWhiteboardInstance();
    if (!simpleWhiteboard) {
      return;
    }
    const { zoom } = simpleWhiteboard.getCanvasCoords();
    this.ctx = context;
    const { x: textX, y: textY } = simpleWhiteboard.coordsToCanvasCoords(
      item.x,
      item.y
    );
    context.font = `${item.options.fontSize * zoom}px ${
      item.options.fontFamily
    }`;

    const prevFillStyle = context.fillStyle;
    context.fillStyle = item.options.color || "#000000";
    item.text.split("\n").forEach((line, i) => {
      context.fillText(
        line,
        textX,
        textY + (i + 1) * item.options.fontSize * zoom
      );
    });
    context.fillStyle = prevFillStyle;
  }

  public override onToolSelected(): void {
    const simpleWhiteboard = this.getSimpleWhiteboardInstance();
    if (!simpleWhiteboard) {
      return;
    }
    const id = super.generateId();
    const item: TextItem = {
      kind: this.getToolName(),
      id,
      options: {
        fontSize: 16,
        fontFamily: "sans-serif",
        color: this.color,
      },
      x: 0,
      y: 0,
      width: 0,
      height: 0,
      text: "",
    };
    simpleWhiteboard.addItem(item, true);
    simpleWhiteboard.setSelectedItemId(id);
  }

  public override getBoundingRect(item: TextItem): BoundingRect | null {
    const splittedText = item.text.split("\n");
    const height = splittedText.length * item.options.fontSize;

    if (!this.ctx) {
      const textWidth = splittedText.reduce((maxWidth, line) => {
        const width = line.length || 0;
        return Math.max(maxWidth, width);
      }, 0);
      return {
        x: item.x - 10,
        y: item.y - 5,
        width: textWidth + 20,
        height: height + 20,
      };
    }

    const textWidth = splittedText.reduce((maxWidth, line) => {
      if (!this.ctx) {
        return maxWidth;
      }
      this.ctx.font = `${item.options.fontSize}px ${item.options.fontFamily}`;
      const width = this.ctx.measureText(line).width || 0;
      return Math.max(maxWidth, width);
    }, 0);

    return {
      x: item.x - 10,
      y: item.y - 5,
      width: textWidth + 20,
      height: height + 20,
    };
  }

  public override getCoordsItem(item: TextItem): { x: number; y: number } {
    return { x: item.x, y: item.y };
  }

  public override setCoordsItem(
    item: TextItem,
    x: number,
    y: number
  ): TextItem {
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

  public override renderToolOptions(item: TextItem | null) {
    const simpleWhiteboard = super.getSimpleWhiteboardInstance();
    if (!simpleWhiteboard) {
      return null;
    }

    // Case: no item selected = new item
    if (!item) {
      return null;
    }

    // Case: item selected => we want to be able to edit the instance
    return html`
      <p>${msg("Edit your text:", { id: "tool-text-edit" })}</p>
      <textarea
        autofocus
        class="width-100-percent"
        @input=${(e: Event) => {
          const target = e.target as HTMLTextAreaElement;
          const text = target.value;
          const updatedItem: TextItem = {
            ...item,
            text,
          };
          simpleWhiteboard.updateItemById(item.id, updatedItem, true);
        }}
        .value=${item.text}
      ></textarea>
      <p>${msg("Size:", { id: "tool-options-size" })}</p>
      <input
        class="width-100-percent"
        type="range"
        min="8"
        max="240"
        step="8"
        .value=${item.options.fontSize}
        @input=${(e: Event) => {
          const target = e.target as HTMLInputElement;
          simpleWhiteboard.updateItemById(
            item.id,
            {
              ...item,
              options: {
                ...item.options,
                fontSize: parseInt(target.value, 10),
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
        @click=${() => {
          simpleWhiteboard.removeItemById(item.id, true);
        }}
      >
        ${msg("Delete", { id: "tool-options-delete" })}
      </button>
    `;
  }
}
