import { localized } from "@lit/localize";
import { WhiteboardElement } from "../../lib/element";
import { customElement } from "lit/decorators.js";
import { CircleTool } from "./tool";
import { SimpleWhiteboard } from "../../simple-whiteboard";
import { itemBuilder } from "./item";

const toolBuilder = (simpleWhiteboardInstance: SimpleWhiteboard) =>
  new CircleTool(simpleWhiteboardInstance, itemBuilder);

@customElement("simple-whiteboard--tool-circle")
@localized()
export class CircleElement extends WhiteboardElement<CircleTool> {
  constructor() {
    super(toolBuilder);
  }
}
