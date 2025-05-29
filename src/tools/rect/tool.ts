import { html, TemplateResult } from "lit";
import { unsafeHTML } from "lit/directives/unsafe-html.js";
import { WhiteboardTool } from "../../lib/tool";
import { getIconSvg } from "../../lib/icons";
import { RectItem } from "./item";
import { RoughCanvasOptions } from "../../lib/types";

import "../../components/colorSelect";

export const RECT_TOOL_NAME = "rect";

export class RectTool extends WhiteboardTool<RectItem> {
  private currentItemId: string | null = null;
  private currentOptions: RoughCanvasOptions = {
    stroke: "#000000",
    strokeWidth: 1,
    fill: "transparent",
  };

  /**
   * Get the icon of the tool.
   * Return `null` if the tool does not have an icon.
   *
   * @returns The icon of the tool.
   */
  public override getIcon(): TemplateResult | null {
    return html`${unsafeHTML(getIconSvg("Square"))}`;
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
    return RECT_TOOL_NAME;
  }

  public override handleDrawingStart(x: number, y: number): void {
    const whiteboard = this.getSimpleWhiteboardInstance();
    const { x: whiteboardX, y: whiteboardY } = whiteboard
      .getCoordsContext()
      .convertFromCanvas(x, y);

    const item = this.newItem({
      x1: whiteboardX,
      x2: whiteboardX,
      y1: whiteboardY,
      y2: whiteboardY,
      options: {
        ...this.getCurrentOptions(),
      },
    });
    this.currentItemId = item.getId();
    this.getSimpleWhiteboardInstance().addItem(item);
  }

  public override handleDrawingMove(x: number, y: number): void {
    if (!this.currentItemId) {
      return;
    }

    const whiteboard = this.getSimpleWhiteboardInstance();
    const { x: whiteboardX, y: whiteboardY } = whiteboard
      .getCoordsContext()
      .convertFromCanvas(x, y);

    const item = whiteboard.getItemById(this.currentItemId);
    if (!item || !(item instanceof RectItem)) {
      return;
    }

    whiteboard.partialItemUpdateById(this.currentItemId, {
      x2: whiteboardX,
      y2: whiteboardY,
    });
  }

  public override handleDrawingEnd(): void {
    if (!this.currentItemId) {
      return;
    }

    const whiteboard = this.getSimpleWhiteboardInstance();
    whiteboard.setCurrentTool(whiteboard.getDefaultToolName());
    whiteboard.setSelectedItemId(this.currentItemId);
    this.currentItemId = null;
  }

  public getCurrentOptions(): RoughCanvasOptions {
    return this.currentOptions;
  }

  public updateCurrentOptions(options: RoughCanvasOptions): void {
    this.currentOptions = {
      ...this.currentOptions,
      ...options,
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
          this.getSimpleWhiteboardInstance().requestUpdate();
        }}
      ></color-select>`;
    });
  }

  public override renderToolOptions(item: RectItem | null) {
    const whiteboard = this.getSimpleWhiteboardInstance();
    const i18n = whiteboard.getI18nContext();

    // Case: no item selected = new item
    if (!item) {
      const currentOptions = this.getCurrentOptions();
      return html`
        <p>${i18n.t("tool-options-stroke-width")}</p>
        <input
          class="width-100-percent"
          type="range"
          min="1"
          max="50"
          step="7"
          .value=${currentOptions.strokeWidth}
          @input=${(e: Event) => {
            const target = e.target as HTMLInputElement;
            this.updateCurrentOptions({
              strokeWidth: parseInt(target.value, 10),
            });
          }}
        />
        <p>${i18n.t("tool-options-stroke")}</p>
        ${this.generateColorSelect(
          ["#000000", "#ff1a40", "#29b312", "#135aa0", "#fc8653"],
          currentOptions.stroke || "#000000",
          (color) => {
            this.updateCurrentOptions({
              stroke: color,
            });
          }
        )}
        <p>${i18n.t("tool-options-fill")}</p>
        ${this.generateColorSelect(
          ["transparent", "#ff8dad", "#9bff8c", "#8fddff", "#ffc7a9"],
          currentOptions.fill || "transparent",
          (color) => {
            this.updateCurrentOptions({
              fill: color,
            });
          }
        )}
      `;
    }

    // Case: item selected
    const currentOptions = item.getOptions();
    const itemId = item.getId();
    return html`
      <p>${i18n.t("tool-options-stroke-width")}</p>
      <input
        class="width-100-percent"
        type="range"
        min="1"
        max="50"
        step="7"
        .value=${currentOptions.strokeWidth}
        @input=${(e: Event) => {
          const target = e.target as HTMLInputElement;
          const value = parseInt(target.value, 10);

          this.updateCurrentOptions({
            strokeWidth: value,
          });

          whiteboard.partialItemUpdateById(itemId, {
            options: { ...currentOptions, strokeWidth: value },
          });
        }}
      />
      <p>${i18n.t("tool-options-stroke")}</p>
      ${this.generateColorSelect(
        ["#000000", "#ff1a40", "#29b312", "#135aa0", "#fc8653"],
        currentOptions.stroke || "#000000",
        (color) => {
          this.updateCurrentOptions({
            stroke: color,
          });

          whiteboard.partialItemUpdateById(itemId, {
            options: { ...currentOptions, stroke: color },
          });
        }
      )}
      <p>${i18n.t("tool-options-fill")}</p>
      ${this.generateColorSelect(
        ["transparent", "#ff8dad", "#9bff8c", "#8fddff", "#ffc7a9"],
        currentOptions.fill || "transparent",
        (color) => {
          this.updateCurrentOptions({
            fill: color,
          });

          whiteboard.partialItemUpdateById(itemId, {
            options: { ...currentOptions, fill: color },
          });
        }
      )}
      <button
        class="button width-100-percent"
        @click=${() => {
          whiteboard.removeItemById(item.getId(), true);
        }}
      >
        ${i18n.t("tool-options-delete")}
      </button>
    `;
  }

  public override onToolSelected(): void {
    super.onToolSelected();
    const whiteboard = this.getSimpleWhiteboardInstance();
    whiteboard.setCursor("crosshair");
  }

  public override onToolUnselected(): void {
    super.onToolUnselected();
    const whiteboard = this.getSimpleWhiteboardInstance();
    whiteboard.setCursor("default");
  }
}
