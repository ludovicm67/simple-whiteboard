import { SimpleWhiteboard } from "./simple-whiteboard";
import { CircleElement } from "./tools/circle/element";
import { ClearElement } from "./tools/clear/element";
import { DefaultTools } from "./tools/defaults";
import { LineElement } from "./tools/line/element";
import { MoveElement } from "./tools/move/element";
import { PenElement } from "./tools/pen/element";
import { TextElement } from "./tools/text/element";
import { PictureElement } from "./tools/picture/element";
import { PointerElement } from "./tools/pointer/element";
import { RectElement } from "./tools/rect/element";
import { EraserElement } from "./tools/eraser/element";

import * as ToolLib from "./lib/tool";
import * as ElementLib from "./lib/element";
import * as ItemLib from "./lib/item";

declare global {
  interface HTMLElementTagNameMap {
    "simple-whiteboard": SimpleWhiteboard;
    "simple-whiteboard--tool-defaults": DefaultTools;
    "simple-whiteboard--tool-circle": CircleElement;
    "simple-whiteboard--tool-clear": ClearElement;
    "simple-whiteboard--tool-line": LineElement;
    "simple-whiteboard--tool-move": MoveElement;
    "simple-whiteboard--tool-pen": PenElement;
    "simple-whiteboard--tool-text": TextElement;
    "simple-whiteboard--tool-picture": PictureElement;
    "simple-whiteboard--tool-pointer": PointerElement;
    "simple-whiteboard--tool-rect": RectElement;
    "simple-whiteboard--tool-eraser": EraserElement;
  }
}

export {
  SimpleWhiteboard,
  DefaultTools,
  CircleElement,
  ClearElement,
  LineElement,
  MoveElement,
  PenElement,
  TextElement,
  PictureElement,
  PointerElement,
  RectElement,
  EraserElement,
  ToolLib,
  ElementLib,
  ItemLib,
};
export default SimpleWhiteboard;
