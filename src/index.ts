import { Whiteboard } from "./whiteboard";

declare global {
  interface HTMLElementTagNameMap {
    "simple-whiteboard": Whiteboard;
  }
}

export default Whiteboard;
