import { html } from "lit";
import { customElement } from "lit/decorators.js";
import { unsafeHTML } from "lit/directives/unsafe-html.js";

import SimpleWhiteboardTool, {
  BoundingRect,
  RoughCanvas,
  WhiteboardItem,
} from "../lib/SimpleWhiteboardTool";
import { getIconSvg } from "../lib/icons";

interface PictureItem extends WhiteboardItem {
  x: number;
  y: number;
  width: number;
  height: number;
  src: string;
}

@customElement("simple-whiteboard--tool-picture")
export class SimpleWhiteboardToolPicture extends SimpleWhiteboardTool {
  private pictureCache: Map<string, HTMLImageElement> = new Map();

  public override getToolIcon() {
    return html`${unsafeHTML(getIconSvg("image"))}`;
  }

  public override getToolName() {
    return "picture";
  }

  public override drawItem(
    _rc: RoughCanvas,
    context: CanvasRenderingContext2D,
    item: PictureItem
  ): void {
    const simpleWhiteboard = super.getSimpleWhiteboardInstance();
    if (!simpleWhiteboard) {
      return;
    }
    const { x: pictureX, y: pictureY } = simpleWhiteboard.coordsToCanvasCoords(
      item.x,
      item.y
    );
    const cachedImage = this.pictureCache.get(item.src);
    if (cachedImage) {
      context.drawImage(
        cachedImage,
        pictureX,
        pictureY,
        item.width,
        item.height
      );
    } else {
      const img = new Image();
      img.onload = () => {
        this.pictureCache.set(item.src, img);
        context.drawImage(img, pictureX, pictureY, item.width, item.height);
      };
      img.src = item.src;
    }
  }

  public override onToolSelected(): void {
    const simpleWhiteboard = this.getSimpleWhiteboardInstance();
    if (!simpleWhiteboard) {
      return;
    }
    simpleWhiteboard.setSelectedItemId(null);
  }

  public override getBoundingRect(item: PictureItem): BoundingRect | null {
    return {
      x: item.x,
      y: item.y,
      width: item.width,
      height: item.height,
    };
  }

  public override renderToolOptions(item: PictureItem | null) {
    const simpleWhiteboard = super.getSimpleWhiteboardInstance();
    if (!simpleWhiteboard) {
      return null;
    }

    // Case: no item selected = new item
    if (!item) {
      return html`
        <label for="picture-src">Image URL:</label>
        <input
          type="file"
          accept="image/*"
          @change=${(e: Event) => {
            const id = super.generateId();
            const target = e.target as HTMLInputElement;
            const file = target.files?.[0];
            if (!file) {
              return;
            }

            const item: PictureItem = {
              kind: this.getToolName(),
              id,
              options: {},
              x: 0,
              y: 0,
              width: 0,
              height: 0,
              src: "",
            };

            const reader = new FileReader();
            reader.onload = (e) => {
              const img = new Image();
              img.onload = () => {
                const updatedItem: PictureItem = {
                  ...item,
                  src: img.src,
                  width: img.width,
                  height: img.height,
                };
                simpleWhiteboard.updateItemById(
                  updatedItem.id,
                  updatedItem,
                  true
                );
                simpleWhiteboard.addItem(updatedItem, true);
                simpleWhiteboard.setSelectedItemId(id);
              };
              img.src = e.target?.result as string;
            };
            reader.readAsDataURL(file);
          }}
        />
      `;
    }

    // Case: item selected => we want to be able to edit the instance
    return html`
      <label for="picture-src">Edit Image URL:</label>
      <input
        type="file"
        accept="image/*"
        @change=${(e: Event) => {
          const target = e.target as HTMLInputElement;
          const file = target.files?.[0];
          if (!file) {
            return;
          }

          const reader = new FileReader();
          reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
              const updatedItem: PictureItem = {
                ...item,
                src: img.src,
                width: img.width,
                height: img.height,
              };
              simpleWhiteboard.updateItemById(
                updatedItem.id,
                updatedItem,
                true
              );
            };
            img.src = e.target?.result as string;
          };
          reader.readAsDataURL(file);
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
