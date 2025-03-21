import { WhiteboardElement } from "../../lib/element";
import { customElement } from "lit/decorators.js";
import { EraserTool } from "./tool";
import { SimpleWhiteboard } from "../../simple-whiteboard";
import { itemBuilder } from "./item";

const toolBuilder = (simpleWhiteboardInstance: SimpleWhiteboard) =>
  new EraserTool(simpleWhiteboardInstance, itemBuilder);

@customElement("simple-whiteboard--tool-eraser")
export class EraserElement extends WhiteboardElement<EraserTool> {
  constructor() {
    super(toolBuilder);
  }
}
