import { WhiteboardElement } from "../../lib/element";
import { customElement } from "lit/decorators.js";
import { RectTool } from "./tool";
import { SimpleWhiteboard } from "../../simple-whiteboard";
import { itemBuilder } from "./item";

const toolBuilder = (simpleWhiteboardInstance: SimpleWhiteboard) =>
  new RectTool(simpleWhiteboardInstance, itemBuilder);

@customElement("simple-whiteboard--tool-rect")
export class RectElement extends WhiteboardElement<RectTool> {
  constructor() {
    super(toolBuilder);
  }
}
