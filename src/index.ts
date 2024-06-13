import { SimpleWhiteboard } from "./simple-whiteboard";

declare global {
  interface HTMLElementTagNameMap {
    "simple-whiteboard": SimpleWhiteboard;
  }
}

export { SimpleWhiteboard };
export default SimpleWhiteboard;
