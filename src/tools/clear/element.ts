import { WhiteboardElement } from "../../lib/element";
import { customElement } from "lit/decorators.js";
import { ClearTool } from "./tool";
import { SimpleWhiteboard } from "../../simple-whiteboard";
import { itemBuilder } from "./item";

const toolBuilder = (simpleWhiteboardInstance: SimpleWhiteboard) =>
  new ClearTool(simpleWhiteboardInstance, itemBuilder);

@customElement("simple-whiteboard--tool-clear")
export class ClearElement extends WhiteboardElement<ClearTool> {
  constructor() {
    super(toolBuilder);
  }
}
