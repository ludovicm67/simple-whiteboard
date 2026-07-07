import { WhiteboardElement } from "../../lib/element";
import { customElement } from "lit/decorators.js";
import { StickyTool } from "./tool";
import { SimpleWhiteboard } from "../../simple-whiteboard";
import { itemBuilder } from "./item";

const toolBuilder = (simpleWhiteboardInstance: SimpleWhiteboard) =>
  new StickyTool(simpleWhiteboardInstance, itemBuilder);

@customElement("simple-whiteboard--tool-sticky")
export class StickyElement extends WhiteboardElement<StickyTool> {
  constructor() {
    super(toolBuilder);
  }
}
