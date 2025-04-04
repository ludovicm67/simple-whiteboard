import { WhiteboardElement } from "../../lib/element";
import { customElement, property } from "lit/decorators.js";
import { PictureTool } from "./tool";
import { SimpleWhiteboard } from "../../simple-whiteboard";
import { itemBuilder } from "./item";

const toolBuilder = (simpleWhiteboardInstance: SimpleWhiteboard) =>
  new PictureTool(simpleWhiteboardInstance, itemBuilder);

@customElement("simple-whiteboard--tool-picture")
export class PictureElement extends WhiteboardElement<PictureTool> {
  @property({ type: Number })
  public maxWidth = 1200;

  @property({ type: Number })
  public maxHeight = 1200;

  constructor() {
    super(toolBuilder);
  }

  protected updated(changedProperties: Map<string | number | symbol, unknown>) {
    const tool = this.getTool();
    if (changedProperties.has("maxWidth")) {
      tool.setMaxWidth(this.maxWidth);
    }
    if (changedProperties.has("maxHeight")) {
      tool.setMaxHeight(this.maxHeight);
    }
  }
}
