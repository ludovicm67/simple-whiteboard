import { localized } from "@lit/localize";
import { WhiteboardElement } from "../../lib/element";
import { customElement } from "lit/decorators.js";
import { PenTool } from "./tool";
import { SimpleWhiteboard } from "../../simple-whiteboard";
import { itemBuilder } from "./item";

const toolBuilder = (simpleWhiteboardInstance: SimpleWhiteboard) =>
  new PenTool(simpleWhiteboardInstance, itemBuilder);

@customElement("simple-whiteboard--tool-pen")
@localized()
export class PenElement extends WhiteboardElement<PenTool> {
  constructor() {
    super(toolBuilder);
  }
}
