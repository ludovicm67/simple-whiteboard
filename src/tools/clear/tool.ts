import { html, TemplateResult } from "lit";
import { unsafeHTML } from "lit/directives/unsafe-html.js";
import { WhiteboardTool } from "../../lib/tool";
import { getIconSvg } from "../../lib/icons";
import { ClearItem } from "./item";

export const CLEAR_TOOL_NAME = "clear";

export class ClearTool extends WhiteboardTool<ClearItem> {
  /**
   * Get the icon of the tool.
   * Return `null` if the tool does not have an icon.
   *
   * @returns The icon of the tool.
   */
  public override getIcon(): TemplateResult | null {
    return html`${unsafeHTML(getIconSvg("Trash2"))}`;
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
    return CLEAR_TOOL_NAME;
  }

  /**
   * Called when the tool is selected.
   *
   * Clearing throws away every item, so it asks first — unless the board is
   * already empty (nothing to lose, the click just resets the view) or the
   * host set `skip-clear-confirmation`.
   */
  public override async onToolSelected(): Promise<void> {
    const simpleWhiteboard = this.getSimpleWhiteboardInstance();
    const i18n = simpleWhiteboard.getI18nContext();

    // Nothing to lose on an empty board, and the host app can opt out of the
    // dialog entirely with `skip-clear-confirmation`.
    const shouldAsk =
      simpleWhiteboard.getItems().length > 0 &&
      !simpleWhiteboard.skipClearConfirmation;
    const confirmed =
      !shouldAsk ||
      (await simpleWhiteboard.confirm({
        title: i18n.t("clear-confirm-title"),
        message: i18n.t("clear-confirm-message"),
        confirmLabel: i18n.t("clear-confirm-accept"),
        cancelLabel: i18n.t("clear-confirm-cancel"),
      }));

    if (confirmed) {
      simpleWhiteboard.clearWhiteboard();
    }

    // Clearing is a one-off action, not a mode: go back to the previous tool
    // whether or not the user went through with it. Answering the dialog takes
    // as long as it takes, so only step aside if this tool is still the active
    // one — the user may have picked another in the meantime.
    const previousTool = simpleWhiteboard.getPreviousTool();
    if (
      simpleWhiteboard.getCurrentTool() === this.getName() &&
      previousTool &&
      previousTool !== this.getName()
    ) {
      simpleWhiteboard.setCurrentTool(previousTool, false);
    }
  }
}
