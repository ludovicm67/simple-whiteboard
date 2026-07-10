import { html, TemplateResult } from "lit";
import { unsafeHTML } from "lit/directives/unsafe-html.js";
import { getIconSvg } from "../lib/icons";
import { WhiteboardItem, WhiteboardItemType } from "../lib/item";
import type { SimpleWhiteboard } from "../simple-whiteboard";

/**
 * The floating tool-options panel (top-left): the selected tool's own options
 * plus the shared stacking-order ("Arrange") controls.
 *
 * Rendered inside the whiteboard's shadow root, so the component styles apply
 * and the handlers call back into the passed `board` instance.
 */
export function renderToolsOptions(
  board: SimpleWhiteboard
): TemplateResult | null {
  // The whole panel can be hidden (e.g. for a compact embedded board where it
  // would otherwise cover the canvas).
  if (board.hideToolOptions) {
    return null;
  }

  const selectedItem = board.getSelectedItem();
  const currentTool = board.getToolInstance(board.getCurrentTool());
  const selectedItemTool = selectedItem
    ? board.getToolInstance(selectedItem.getType())
    : null;
  const tool = selectedItemTool || currentTool;

  const options = tool ? tool.renderToolOptions(selectedItem) : null;
  // Stacking-order controls are shared by every item type, so they are rendered
  // here rather than in each tool.
  const layerControls = selectedItem
    ? renderLayerControls(board, selectedItem)
    : null;

  if (!options && !layerControls) {
    return null;
  }
  return html`<div class="tools-options">${options}${layerControls}</div>`;
}

/**
 * Render the stacking-order ("Arrange") controls for the selected item.
 */
function renderLayerControls(
  board: SimpleWhiteboard,
  item: WhiteboardItem<WhiteboardItemType>
): TemplateResult {
  const i18n = board.getI18nContext();
  const id = item.getId();
  const index = board.getItemIndexById(id) ?? 0;
  const isAtBack = index <= 0;
  const isAtFront = index >= board.getItems().length - 1;

  const button = (
    icon: string,
    labelKey: string,
    action: () => void,
    disabled: boolean
  ) => html`<button
    class="layer-button"
    title=${i18n.t(labelKey)}
    aria-label=${i18n.t(labelKey)}
    ?disabled=${disabled}
    @click=${action}
  >
    ${unsafeHTML(getIconSvg(icon))}
  </button>`;

  return html`
    <p>${i18n.t("tool-options-arrange")}</p>
    <div class="layer-tools">
      ${button(
        "ArrowDownToLine",
        "tool-options-send-to-back",
        () => board.sendItemToBack(id, true),
        isAtBack
      )}
      ${button(
        "ArrowDown",
        "tool-options-send-backward",
        () => board.moveItemBackward(id, true),
        isAtBack
      )}
      ${button(
        "ArrowUp",
        "tool-options-bring-forward",
        () => board.moveItemForward(id, true),
        isAtFront
      )}
      ${button(
        "ArrowUpToLine",
        "tool-options-bring-to-front",
        () => board.bringItemToFront(id, true),
        isAtFront
      )}
    </div>
  `;
}
