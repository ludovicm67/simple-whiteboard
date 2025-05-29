import { html, TemplateResult } from "lit";
import { unsafeHTML } from "lit/directives/unsafe-html.js";
import { WhiteboardTool } from "../../lib/tool";
import { getIconSvg } from "../../lib/icons";
import { TextItem, TextOptions } from "./item";

import "../../components/colorSelect";

export const TEXT_TOOL_NAME = "text";

export class TextTool extends WhiteboardTool<TextItem> {
  private lastSelectedItemId: string | null = null;

  private currentOptions: TextOptions = {
    fontSize: 16,
    fontFamily: "sans-serif",
    color: "#000000",
  };

  /**
   * Get the icon of the tool.
   * Return `null` if the tool does not have an icon.
   *
   * @returns The icon of the tool.
   */
  public override getIcon(): TemplateResult | null {
    return html`${unsafeHTML(getIconSvg("Type"))}`;
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
    return TEXT_TOOL_NAME;
  }

  public override handleDrawingStart(x: number, y: number): void {
    const whiteboard = this.getSimpleWhiteboardInstance();
    const { x: whiteboardX, y: whiteboardY } = whiteboard
      .getCoordsContext()
      .convertFromCanvas(x, y);

    const item = this.newItem({
      x: whiteboardX,
      y: whiteboardY,
      content: "",
      options: {
        ...this.getCurrentOptions(),
      },
    });
    whiteboard.addItem(item);
    whiteboard.setCurrentTool(whiteboard.getDefaultToolName());
    whiteboard.setSelectedItemId(item.getId());

    this.lastSelectedItemId = item.getId();
    item.setEditing(true);
  }

  public getCurrentOptions(): TextOptions {
    return this.currentOptions;
  }

  public updateCurrentOptions(options: Partial<TextOptions>): void {
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

  public override renderToolOptions(item: TextItem | null) {
    const whiteboard = this.getSimpleWhiteboardInstance();
    const i18n = whiteboard.getI18nContext();

    // Case: no item selected = new item
    if (!item) {
      return html`<p>Click somewhere to create a text zone</p>`;
    }

    // Case: item selected
    const currentOptions = item.getOptions();
    const itemId = item.getId();
    return html`
      <p>${i18n.t("tool-text-edit")}</p>
      <button
        class="button width-100-percent"
        @click=${() => {
          this.lastSelectedItemId = itemId;
          item.setEditing(true);
          whiteboard.requestUpdate();
        }}
      >
        ${i18n.t("tool-text-edit")}
      </button>
      <p>${i18n.t("tool-options-size")}</p>
      <input
        class="width-100-percent"
        type="range"
        min="8"
        max="240"
        step="8"
        .value=${currentOptions.fontSize}
        @input=${(e: Event) => {
          const target = e.target as HTMLInputElement;
          const value = parseInt(target.value, 10);

          this.updateCurrentOptions({
            fontSize: value,
          });

          whiteboard.partialItemUpdateById(itemId, {
            options: { ...currentOptions, fontSize: value },
          });
        }}
      />
      <p>${i18n.t("tool-options-color")}</p>
      ${this.generateColorSelect(
        ["#000000", "#ff1a40", "#29b312", "#135aa0", "#fc8653"],
        currentOptions.color || "#000000",
        (color) => {
          this.updateCurrentOptions({
            color,
          });

          whiteboard.partialItemUpdateById(itemId, {
            options: { ...currentOptions, color },
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
    const item = (
      this.lastSelectedItemId
        ? whiteboard.getItemById(this.lastSelectedItemId)
        : null
    ) as TextItem | null;
    if (item) {
      item.setEditing(false);
      this.lastSelectedItemId = null;
      this.getSimpleWhiteboardInstance().requestUpdate();
    }
  }
}
