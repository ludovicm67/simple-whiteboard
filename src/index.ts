import { SimpleWhiteboard } from "./simple-whiteboard";
import SimpleWhiteboardTool from "./lib/SimpleWhiteboardTool";
export type {
  BoundingRect,
  RoughCanvas,
  RoughCanvasOptions,
  SimpleWhiteboardToolInterface,
  WhiteboardItem,
} from "./lib/SimpleWhiteboardTool";
import { SimpleWhiteboardToolCircle } from "./tools/circle";
import { SimpleWhiteboardToolClear } from "./tools/clear";
import { SimpleWhiteboardToolDefaults } from "./tools/defaults";
import { SimpleWhiteboardToolLine } from "./tools/line";
import { SimpleWhiteboardToolMove } from "./tools/move";
import { SimpleWhiteboardToolPen } from "./tools/pen";
import { SimpleWhiteboardToolPicture } from "./tools/picture";
import { SimpleWhiteboardToolPointer } from "./tools/pointer";
import { SimpleWhiteboardToolRect } from "./tools/rect";
import { SimpleWhiteboardToolEraser } from "./tools/eraser";

declare global {
  interface HTMLElementTagNameMap {
    "simple-whiteboard": SimpleWhiteboard;
  }
}

export {
  SimpleWhiteboard,
  SimpleWhiteboardTool,
  SimpleWhiteboardToolCircle,
  SimpleWhiteboardToolClear,
  SimpleWhiteboardToolDefaults,
  SimpleWhiteboardToolLine,
  SimpleWhiteboardToolMove,
  SimpleWhiteboardToolPen,
  SimpleWhiteboardToolPicture,
  SimpleWhiteboardToolPointer,
  SimpleWhiteboardToolRect,
  SimpleWhiteboardToolEraser,
};
export default SimpleWhiteboard;
