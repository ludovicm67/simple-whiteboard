import { localized } from "@lit/localize";
import { WhiteboardElement } from "../../lib/element";
import { customElement } from "lit/decorators.js";
import { LineTool } from "./tool";
import { SimpleWhiteboard } from "../../simple-whiteboard";
import { itemBuilder } from "./item";

const toolBuilder = (simpleWhiteboardInstance: SimpleWhiteboard) =>
  new LineTool(simpleWhiteboardInstance, itemBuilder);

@customElement("simple-whiteboard--tool-line")
@localized()
export class LineElement extends WhiteboardElement<LineTool> {
  constructor() {
    super(toolBuilder);
  }
}
