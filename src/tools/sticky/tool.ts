import { html, TemplateResult } from "lit";
import { unsafeHTML } from "lit/directives/unsafe-html.js";
import { WhiteboardTool } from "../../lib/tool";
import { getIconSvg } from "../../lib/icons";
import { StickyItem } from "./item";

import "../../components/colorSelect";

export const STICKY_TOOL_NAME = "sticky";

// Default size of a freshly created note, in world units.
const DEFAULT_SIZE = 180;

// Preset paper colors.
const NOTE_COLORS = [
  "#ffe084",
  "#ffc2d1",
  "#b8f2c9",
  "#a9d5ff",
  "#ffd7a8",
];

interface StickyToolOptions {
  backgroundColor: string;
  color: string;
  fontSize: number;
}

export class StickyTool extends WhiteboardTool<StickyItem> {
  private lastSelectedItemId: string | null = null;

  private currentOptions: StickyToolOptions = {
    backgroundColor: NOTE_COLORS[0],
    color: "#1f2933",
    fontSize: 16,
  };

  /**
   * Get the icon of the tool.
   *
   * @returns The icon of the tool.
   */
  public override getIcon(): TemplateResult | null {
    return html`${unsafeHTML(getIconSvg("StickyNote"))}`;
  }

  /**
   * Get the (unique, internal) name of the tool.
   *
   * @returns The name of the tool.
   */
  public override getName(): string {
    return STICKY_TOOL_NAME;
  }

  public override handleDrawingStart(x: number, y: number): void {
    const whiteboard = this.getSimpleWhiteboardInstance();
    const { x: whiteboardX, y: whiteboardY } = whiteboard
      .getCoordsContext()
      .convertFromCanvas(x, y);

    const half = DEFAULT_SIZE / 2;
    const options = this.getCurrentOptions();
    const item = this.newItem({
      x1: whiteboardX - half,
      y1: whiteboardY - half,
      x2: whiteboardX + half,
      y2: whiteboardY + half,
      content: "",
      backgroundColor: options.backgroundColor,
      color: options.color,
      fontSize: options.fontSize,
    });

    whiteboard.addItem(item);
    // Switch back to the default tool and select the new note. The ordering
    // matters: `lastSelectedItemId`/editing are set after switching so the
    // tool's own `onToolUnselected` does not immediately cancel the editing.
    whiteboard.setCurrentTool(whiteboard.getDefaultToolName());
    whiteboard.setSelectedItemId(item.getId());

    this.lastSelectedItemId = item.getId();
    item.setEditing(true);
  }

  public getCurrentOptions(): StickyToolOptions {
    return this.currentOptions;
  }

  public updateCurrentOptions(options: Partial<StickyToolOptions>): void {
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

  public override renderToolOptions(item: StickyItem | null) {
    const whiteboard = this.getSimpleWhiteboardInstance();
    const i18n = whiteboard.getI18nContext();

    // Case: no item selected = new note
    if (!item) {
      return html`
        <p>${i18n.t("tool-options-color")}</p>
        ${this.generateColorSelect(
          NOTE_COLORS,
          this.getCurrentOptions().backgroundColor,
          (color) => {
            this.updateCurrentOptions({ backgroundColor: color });
          }
        )}
      `;
    }

    // Case: note selected
    const currentOptions = item.getOptions();
    const itemId = item.getId();
    return html`
      <button
        class="button width-100-percent"
        @click=${() => {
          this.lastSelectedItemId = itemId;
          item.setEditing(true);
          whiteboard.requestUpdate();
        }}
      >
        ${i18n.t("tool-sticky-edit")}
      </button>
      <p>${i18n.t("tool-options-color")}</p>
      ${this.generateColorSelect(
        NOTE_COLORS,
        currentOptions.backgroundColor,
        (color) => {
          this.updateCurrentOptions({ backgroundColor: color });
          whiteboard.partialItemUpdateById(itemId, { backgroundColor: color });
        }
      )}
      <p>${i18n.t("tool-options-size")}</p>
      <input
        class="width-100-percent"
        type="range"
        min="8"
        max="48"
        step="4"
        .value=${currentOptions.fontSize}
        @input=${(e: Event) => {
          const target = e.target as HTMLInputElement;
          const value = parseInt(target.value, 10);
          this.updateCurrentOptions({ fontSize: value });
          whiteboard.partialItemUpdateById(itemId, { fontSize: value });
        }}
      />
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

    const item = this.lastSelectedItemId
      ? (whiteboard.getItemById(this.lastSelectedItemId) as StickyItem | null)
      : null;
    if (item) {
      item.setEditing(false);
      this.lastSelectedItemId = null;
      whiteboard.requestUpdate();
    }
  }
}
