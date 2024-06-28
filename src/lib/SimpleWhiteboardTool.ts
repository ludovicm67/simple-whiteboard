import { LitElement, TemplateResult } from "lit";
import { SimpleWhiteboard } from "../simple-whiteboard";

interface SimpleWhiteboardToolInterface {
  getToolIcon: () => TemplateResult | null;
}

abstract class SimpleWhiteboardTool
  extends LitElement
  implements SimpleWhiteboardToolInterface
{
  /**
   * Get the icon of the tool.
   * Return `null` if the tool does not have an icon.
   *
   * @returns The icon of the tool.
   */
  public getToolIcon(): TemplateResult | null {
    return null;
  }

  /**
   * Get the nearest `SimpleWhiteboard` element.
   *
   * @returns The nearest `SimpleWhiteboard` element.
   */
  public findNearestCustomElement(): SimpleWhiteboard | null {
    let current: Node | null = this;

    while (current) {
      current =
        current.parentNode || (current.getRootNode() as ShadowRoot).host;
      if (
        current &&
        (current as HTMLElement).tagName &&
        (current as HTMLElement).tagName.toLowerCase() === "simple-whiteboard"
      ) {
        return current as SimpleWhiteboard;
      }
    }
    return null;
  }

  protected firstUpdated(): void {
    const simpleWhiteboard = this.findNearestCustomElement();
    console.log("firstUpdated", simpleWhiteboard);
    if (simpleWhiteboard) {
      simpleWhiteboard.registerTool(this);
    }
  }
}

export default SimpleWhiteboardTool;
export type { SimpleWhiteboardTool };
