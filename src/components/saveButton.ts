import { html } from "lit";
import { unsafeHTML } from "lit/directives/unsafe-html.js";
import { getIconSvg } from "../lib/icons";

export const render = (action: Function) => {
  return html` <button @click=${action}>
    ${unsafeHTML(getIconSvg("save"))}
  </button>`;
};
