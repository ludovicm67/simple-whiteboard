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
   * Get the name of the tool.
   * It's the name that will be used to identify the tool internally.
   * It should be unique.
   * By default, it returns the tag name of the tool in lowercase.
   *
   * @returns The name of the tool.
   */
  public getToolName(): string {
    return this.tagName.toLowerCase();
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
    if (simpleWhiteboard) {
      simpleWhiteboard.registerTool(this);
    } else {
      console.error(
        `Failed to register tool: ${this.tagName} (no <simple-whiteboard> parent found)`
      );
    }
  }
}

export default SimpleWhiteboardTool;
export type { SimpleWhiteboardTool };
