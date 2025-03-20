import { html, TemplateResult } from "lit";
import { unsafeHTML } from "lit/directives/unsafe-html.js";
import { WhiteboardTool } from "../../lib/tool";
import { getIconSvg } from "../../lib/icons";
import { PenItem, PenItemOptions } from "./item";

import "../../components/colorSelect";

export const PEN_TOOL_NAME = "pen";

export class PenTool extends WhiteboardTool<PenItem> {
  private currentItemId: string | null = null;
  private currentOptions: PenItemOptions = {
    size: 6,
    smoothing: 0.5,
    thinning: 0.5,
    streamline: 0.5,
    color: "#000000",
  };

  /**
   * Get the icon of the tool.
   * Return `null` if the tool does not have an icon.
   *
   * @returns The icon of the tool.
   */
  public override getIcon(): TemplateResult | null {
    return html`${unsafeHTML(getIconSvg("Edit2"))}`;
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
    return PEN_TOOL_NAME;
  }

  public override handleDrawingStart(x: number, y: number): void {
    const whiteboard = this.getSimpleWhiteboardInstance();
    const { x: whiteboardX, y: whiteboardY } = whiteboard
      .getCoordsContext()
      .convertFromCanvas(x, y);

    const item = this.newItem({
      path: [{ x: whiteboardX, y: whiteboardY }],
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
    if (!item || !(item instanceof PenItem)) {
      return;
    }

    const itemData = item.export().data;
    item.partialUpdate({
      path: [...itemData.path, { x: whiteboardX, y: whiteboardY }],
    });
  }

  public override handleDrawingEnd(): void {
    this.currentItemId = null;
  }

  public getCurrentOptions(): PenItemOptions {
    return this.currentOptions;
  }

  public updateCurrentOptions(options: Partial<PenItemOptions>): void {
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

  public override renderToolOptions(item: PenItem | null) {
    const whiteboard = this.getSimpleWhiteboardInstance();
    const i18n = whiteboard.getI18nContext();

    // Case: no item selected = new item
    if (!item) {
      const currentOptions = this.getCurrentOptions();
      return html`
        <p>${i18n.t("tool-options-size")}</p>
        <input
          class="width-100-percent"
          type="range"
          min="1"
          max="50"
          step="7"
          .value=${currentOptions.size}
          @input=${(e: Event) => {
            const target = e.target as HTMLInputElement;
            this.updateCurrentOptions({
              size: parseInt(target.value, 10),
            });
          }}
        />
        <p>${i18n.t("tool-options-color")}</p>
        ${this.generateColorSelect(
          ["#000000", "#ff1a40", "#29b312", "#135aa0", "#fc8653"],
          currentOptions.color || "#000000",
          (color) => {
            this.updateCurrentOptions({
              color: color,
            });
          }
        )}
      `;
    }

    // Case: item selected
    const currentOptions = item.getOptions();
    return html`
      <p>${i18n.t("tool-options-size")}</p>
      <input
        class="width-100-percent"
        type="range"
        min="1"
        max="50"
        step="7"
        .value=${currentOptions.size}
        @input=${(e: Event) => {
          const target = e.target as HTMLInputElement;
          const value = parseInt(target.value, 10);

          this.updateCurrentOptions({
            size: value,
          });

          item.partialUpdate({
            options: { ...currentOptions, size: value },
          });
        }}
      />
      <p>${i18n.t("tool-options-color")}</p>
      ${this.generateColorSelect(
        ["#000000", "#ff1a40", "#29b312", "#135aa0", "#fc8653"],
        currentOptions.color || "#000000",
        (color) => {
          this.updateCurrentOptions({
            color: color,
          });

          item.partialUpdate({
            options: { ...currentOptions, color: color },
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
}
