import { html, TemplateResult } from "lit";
import { unsafeHTML } from "lit/directives/unsafe-html.js";
import { getIconSvg } from "../lib/icons";
import type { SimpleWhiteboard } from "../simple-whiteboard";
import "../components/zoomSelect";

/**
 * The bottom-left footer: undo/redo buttons, the zoom selector, and (in debug
 * mode) the live pointer coordinates.
 *
 * These are plain template helpers rather than methods, but they still render
 * inside the whiteboard's shadow root, so the component's styles apply and the
 * event handlers can call back into the passed `board` instance.
 */
export function renderFooterTools(board: SimpleWhiteboard): TemplateResult {
  return html`<div class="footer-tools">
    ${renderHistoryControls(board)} ${renderZoomSelect(board)}
    ${renderDebug(board)}
  </div>`;
}

function renderHistoryControls(board: SimpleWhiteboard): TemplateResult {
  const i18n = board.getI18nContext();
  return html`<div class="history-tools">
    <button
      class="history-button"
      ?disabled=${!board.canUndo()}
      title=${i18n.t("history-undo")}
      aria-label=${i18n.t("history-undo")}
      @click=${() => board.undo()}
    >
      ${unsafeHTML(getIconSvg("Undo2"))}
    </button>
    <button
      class="history-button"
      ?disabled=${!board.canRedo()}
      title=${i18n.t("history-redo")}
      aria-label=${i18n.t("history-redo")}
      @click=${() => board.redo()}
    >
      ${unsafeHTML(getIconSvg("Redo2"))}
    </button>
  </div>`;
}

function renderZoomSelect(board: SimpleWhiteboard): TemplateResult {
  return html`<simple-whiteboard-zoom-select
    .instance=${board}
    .zoom=${board.getCoordsContext().getZoom()}
  ></simple-whiteboard-zoom-select>`;
}

function renderDebug(board: SimpleWhiteboard): TemplateResult | null {
  if (!board.debug) {
    return null;
  }

  const { x, y } = board.getMouseCoords();
  return html`<pre>
${Math.round(x * 100) / 100}x${Math.round(y * 100) / 100}</pre
  >`;
}
