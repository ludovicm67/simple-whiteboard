import { html } from "lit";
import { customElement } from "lit/decorators.js";
import { unsafeHTML } from "lit/directives/unsafe-html.js";

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
  fontSize: number;
  fontFamily: string;
}

@customElement("simple-whiteboard--tool-text")
export class SimpleWhiteboardToolPicture extends SimpleWhiteboardTool {
  private ctx: CanvasRenderingContext2D | null = null;

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
    this.ctx = context;
    const { x: textX, y: textY } = simpleWhiteboard.coordsToCanvasCoords(
      item.x,
      item.y
    );
    context.font = `${item.fontSize}px ${item.fontFamily}`;
    item.text.split("\n").forEach((line, i) => {
      context.fillText(line, textX, textY + (i + 1) * item.fontSize);
    });
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
      options: {},
      x: 0,
      y: 0,
      width: 0,
      height: 0,
      text: "",
      fontSize: 24,
      fontFamily: "sans-serif",
    };
    simpleWhiteboard.addItem(item, true);
    simpleWhiteboard.setSelectedItemId(id);
  }

  public override getBoundingRect(item: TextItem): BoundingRect | null {
    const splittedText = item.text.split("\n");
    const height = splittedText.length * item.fontSize;

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
      const width = this.ctx?.measureText(line).width || 0;
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
      <p>Edit your text:</p>
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
