import { WhiteboardElement } from "../../lib/element";
import { customElement } from "lit/decorators.js";
import { PointerTool } from "./tool";
import { SimpleWhiteboard } from "../../simple-whiteboard";
import { itemBuilder } from "./item";

const toolBuilder = (simpleWhiteboardInstance: SimpleWhiteboard) =>
  new PointerTool(simpleWhiteboardInstance, itemBuilder);

@customElement("simple-whiteboard--tool-pointer")
export class PointerElement extends WhiteboardElement<PointerTool> {
  constructor() {
    super(toolBuilder);
  }
}
