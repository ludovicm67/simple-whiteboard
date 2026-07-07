import { WhiteboardElement } from "../../lib/element";
import { customElement } from "lit/decorators.js";
import { ArrowTool } from "./tool";
import { SimpleWhiteboard } from "../../simple-whiteboard";
import { itemBuilder } from "./item";

const toolBuilder = (simpleWhiteboardInstance: SimpleWhiteboard) =>
  new ArrowTool(simpleWhiteboardInstance, itemBuilder);

@customElement("simple-whiteboard--tool-arrow")
export class ArrowElement extends WhiteboardElement<ArrowTool> {
  constructor() {
    super(toolBuilder);
  }
}
