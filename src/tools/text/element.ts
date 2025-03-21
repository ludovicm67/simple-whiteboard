import { WhiteboardElement } from "../../lib/element";
import { customElement } from "lit/decorators.js";
import { TextTool } from "./tool";
import { SimpleWhiteboard } from "../../simple-whiteboard";
import { itemBuilder } from "./item";

const toolBuilder = (simpleWhiteboardInstance: SimpleWhiteboard) =>
  new TextTool(simpleWhiteboardInstance, itemBuilder);

@customElement("simple-whiteboard--tool-text")
export class TextElement extends WhiteboardElement<TextTool> {
  constructor() {
    super(toolBuilder);
  }
}
