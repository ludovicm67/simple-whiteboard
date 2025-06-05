import { html, TemplateResult } from "lit";
import { unsafeHTML } from "lit/directives/unsafe-html.js";
import { WhiteboardTool } from "../../lib/tool";
import { getIconSvg } from "../../lib/icons";
import { EraserItem, EraserItemOptions } from "./item";

import "../../components/colorSelect";

export const ERASER_TOOL_NAME = "eraser";

export class EraserTool extends WhiteboardTool<EraserItem> {
  private currentItemId: string | null = null;
  private currentOptions: EraserItemOptions = {
    size: 25,
    smoothing: 0.5,
    thinning: 0.5,
    streamline: 0.5,
    color: "#fcfcff",
  };

  /**
   * Get the icon of the tool.
   * Return `null` if the tool does not have an icon.
   *
   * @returns The icon of the tool.
   */
  public override getIcon(): TemplateResult | null {
    return html`${unsafeHTML(getIconSvg("Eraser"))}`;
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
    return ERASER_TOOL_NAME;
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
    if (!item || !(item instanceof EraserItem)) {
      return;
    }

    const itemData = item.export().data;
    whiteboard.partialItemUpdateById(this.currentItemId, {
      path: [...itemData.path, { x: whiteboardX, y: whiteboardY }],
    });
  }

  public override handleDrawingEnd(): void {
    this.currentItemId = null;
  }

  public getCurrentOptions(): EraserItemOptions {
    return this.currentOptions;
  }

  public updateCurrentOptions(options: Partial<EraserItemOptions>): void {
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

  public override renderToolOptions(item: EraserItem | null) {
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
          max="161"
          step="8"
          .value=${currentOptions.size}
          @input=${(e: Event) => {
            const target = e.target as HTMLInputElement;
            this.updateCurrentOptions({
              size: parseInt(target.value, 10),
            });
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
