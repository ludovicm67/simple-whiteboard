import { localized } from "@lit/localize";
import { WhiteboardElement } from "../../lib/element";
import { customElement } from "lit/decorators.js";
import { MoveTool } from "./tool";
import { SimpleWhiteboard } from "../../simple-whiteboard";
import { itemBuilder } from "./item";

const toolBuilder = (simpleWhiteboardInstance: SimpleWhiteboard) =>
  new MoveTool(simpleWhiteboardInstance, itemBuilder);

@customElement("simple-whiteboard--tool-move")
@localized()
export class MoveElement extends WhiteboardElement<MoveTool> {
  constructor() {
    super(toolBuilder);
  }
}
