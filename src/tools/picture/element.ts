import { WhiteboardElement } from "../../lib/element";
import { customElement } from "lit/decorators.js";
import { PictureTool } from "./tool";
import { SimpleWhiteboard } from "../../simple-whiteboard";
import { itemBuilder } from "./item";

const toolBuilder = (simpleWhiteboardInstance: SimpleWhiteboard) =>
  new PictureTool(simpleWhiteboardInstance, itemBuilder);

@customElement("simple-whiteboard--tool-picture")
export class PictureElement extends WhiteboardElement<PictureTool> {
  constructor() {
    super(toolBuilder);
  }
}
