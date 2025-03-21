import { html, TemplateResult } from "lit";
import { unsafeHTML } from "lit/directives/unsafe-html.js";
import { WhiteboardTool } from "../../lib/tool";
import { getIconSvg } from "../../lib/icons";
import { PictureItem } from "./item";

export const PICTURE_TOOL_NAME = "picture";

export class PictureTool extends WhiteboardTool<PictureItem> {
  /**
   * Get the icon of the tool.
   * Return `null` if the tool does not have an icon.
   *
   * @returns The icon of the tool.
   */
  public override getIcon(): TemplateResult | null {
    return html`${unsafeHTML(getIconSvg("Image"))}`;
  }

  /**
   * Get the name of the tool.
   * It's the name that will be used to identify the tool internally.
   * It should be unique.
   * By default, it returns the tag name of the tool in lowercase.
   *
   * @returns The name of the tool.
   */
  public override getName(): string {
    return PICTURE_TOOL_NAME;
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
          this.getSimpleWhiteboardInstance().requestUpdate();
        }}
      ></color-select>`;
    });
  }

  public override renderToolOptions(item: PictureItem | null) {
    const whiteboard = this.getSimpleWhiteboardInstance();
    const i18n = whiteboard.getI18nContext();

    const canvasElem = whiteboard.getCanvasElement();
    if (!canvasElem) {
      return null;
    }

    // Get canvas size
    const canvasRect = canvasElem.getBoundingClientRect();
    const scaleFactor = 0.8;
    const canvasWidth = canvasRect.width * scaleFactor;
    const canvasHeight = canvasRect.height * scaleFactor;

    // Case: no item selected = new item
    if (!item) {
      return html`
        <label for="picture-src"
          >${i18n.t("tool-options-select-picture")}</label
        >
        <input
          class="width-100-percent"
          type="file"
          accept="image/*"
          @change=${(e: Event) => {
            const newItem = this.newItem({
              x: 0,
              y: 0,
              width: 0,
              height: 0,
              src: null,
            });
            const newItemId = newItem.getId();
            this.getSimpleWhiteboardInstance().addItem(newItem);

            const target = e.target as HTMLInputElement;
            const file = target.files?.[0];
            if (!file) {
              return;
            }

            const reader = new FileReader();
            reader.onload = (e) => {
              const img = new Image();
              img.onload = () => {
                let newWidth = img.width;
                let newHeight = img.height;

                // Image should be at most 80% of the canvas size
                const width = Math.min(img.width, canvasWidth);
                const height = Math.min(img.height, canvasHeight);

                // Fix aspect ratio
                const aspectRatio = img.width / img.height;
                if (width / aspectRatio > height) {
                  newWidth = height * aspectRatio;
                  newHeight = height;
                } else {
                  newWidth = width;
                  newHeight = width / aspectRatio;
                }

                const coordsContext = whiteboard.getCoordsContext();
                const { x, y } = coordsContext.getCoords();

                whiteboard.partialItemUpdateById(newItemId, {
                  src: img.src,
                  x: -newWidth / 2 + x,
                  y: -newHeight / 2 + y,
                  width: newWidth,
                  height: newHeight,
                });

                // Use the default tool after adding the image
                whiteboard.setCurrentTool(
                  whiteboard.getDefaultToolName() ?? ""
                );

                // Select the new item, so that the user can delete it
                whiteboard.setSelectedItemId(newItemId);
              };
              img.src = e.target?.result as string;
            };
            reader.readAsDataURL(file);
          }}
        />
      `;
    }

    // Case: item selected
    const itemId = item.getId();
    return html`
      <button
        class="button width-100-percent"
        @click=${() => {
          whiteboard.removeItemById(itemId, true);
        }}
      >
        ${i18n.t("tool-options-delete")}
      </button>
    `;
  }
}
