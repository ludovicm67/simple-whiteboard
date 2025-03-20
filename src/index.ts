import { SimpleWhiteboard } from "./simple-whiteboard";
import SimpleWhiteboardTool from "./lib/SimpleWhiteboardTool";
export type {
  BoundingRect,
  RoughCanvas,
  RoughCanvasOptions,
  SimpleWhiteboardToolInterface,
  WhiteboardItem,
} from "./lib/SimpleWhiteboardTool";
import { CircleElement } from "./tools/circle/element";
import { ClearElement } from "./tools/clear/element";
import { DefaultTools } from "./tools/defaults";
import { LineElement } from "./tools/line/element";
import { MoveElement } from "./tools/move/element";
import { PenElement } from "./tools/pen/element";
import { SimpleWhiteboardToolText } from "./tools/text";
import { SimpleWhiteboardToolPicture } from "./tools/picture";
import { PointerElement } from "./tools/pointer/element";
import { RectElement } from "./tools/rect/element";
import { SimpleWhiteboardToolEraser } from "./tools/eraser";

declare global {
  interface HTMLElementTagNameMap {
    "simple-whiteboard": SimpleWhiteboard;
    "simple-whiteboard--tool-defaults": DefaultTools;
    "simple-whiteboard--tool-circle": CircleElement;
    "simple-whiteboard--tool-clear": ClearElement;
    "simple-whiteboard--tool-line": LineElement;
    "simple-whiteboard--tool-move": MoveElement;
    "simple-whiteboard--tool-pen": PenElement;
    "simple-whiteboard--tool-text": SimpleWhiteboardToolText;
    "simple-whiteboard--tool-picture": SimpleWhiteboardToolPicture;
    "simple-whiteboard--tool-pointer": PointerElement;
    "simple-whiteboard--tool-rect": RectElement;
    "simple-whiteboard--tool-eraser": SimpleWhiteboardToolEraser;
  }
}

export {
  SimpleWhiteboard,
  DefaultTools,
  SimpleWhiteboardTool,
  CircleElement,
  ClearElement,
  LineElement,
  MoveElement,
  PenElement,
  SimpleWhiteboardToolText,
  SimpleWhiteboardToolPicture,
  PointerElement,
  RectElement,
  SimpleWhiteboardToolEraser,
};
export default SimpleWhiteboard;
