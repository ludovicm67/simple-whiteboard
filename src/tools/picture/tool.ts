import { html, TemplateResult } from "lit";
import { unsafeHTML } from "lit/directives/unsafe-html.js";
import { WhiteboardTool } from "../../lib/tool";
import { getIconSvg } from "../../lib/icons";
import { PictureItem } from "./item";

export const PICTURE_TOOL_NAME = "picture";

/**
 * Resize an image to fit within the specified maximum width and height, maintaining the aspect ratio.
 *
 * @param image - The image element to resize.
 * @param maxWidth - The maximum width of the resized image.
 * @param maxHeight - The maximum height of the resized image.
 * @returns The resized image as a Data URL.
 */
const resizeImage = (
  image: HTMLImageElement,
  maxWidth: number,
  maxHeight: number
): string => {
  let width = image.width;
  let height = image.height;

  // Maintain aspect ratio
  if (width > height) {
    if (width > maxWidth) {
      height *= maxWidth / width;
      width = maxWidth;
    }
  } else {
    if (height > maxHeight) {
      width *= maxHeight / height;
      height = maxHeight;
    }
  }

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Canvas context is null");
  }

  ctx.drawImage(image, 0, 0, width, height);

  // Return resized image as Data URL
  return canvas.toDataURL("image/png");
};

export class PictureTool extends WhiteboardTool<PictureItem> {
  private maxWidth: number = 1200;
  private maxHeight: number = 1200;

  /**
   * Set the maximum height of the image to be uploaded.
   *
   * @param maxWidth Maximum width of the image to be uploaded.
   */
  public setMaxWidth(maxWidth: number) {
    this.maxWidth = maxWidth;
  }

  /**
   * Set the maximum height of the image to be uploaded.
   *
   * @param maxHeight Maximum height of the image to be uploaded.
   */
  public setMaxHeight(maxHeight: number) {
    this.maxHeight = maxHeight;
  }

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
                // First resize the image to a maximum size (to avoid using too much memory)
                const resizedDataUrl = resizeImage(
                  img,
                  this.maxWidth,
                  this.maxHeight
                );

                const resizedImg = new Image();
                resizedImg.onload = () => {
                  let newWidth = resizedImg.width;
                  let newHeight = resizedImg.height;

                  const width = Math.min(resizedImg.width, canvasWidth);
                  const height = Math.min(resizedImg.height, canvasHeight);

                  const aspectRatio = resizedImg.width / resizedImg.height;
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
                    src: resizedImg.src,
                    x: -newWidth / 2 + x,
                    y: -newHeight / 2 + y,
                    width: newWidth,
                    height: newHeight,
                  });

                  whiteboard.setCurrentTool(
                    whiteboard.getDefaultToolName() ?? ""
                  );
                  whiteboard.setSelectedItemId(newItemId);
                };
                resizedImg.src = resizedDataUrl;
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
