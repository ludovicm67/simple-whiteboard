import { LitElement } from "lit";
import { SimpleWhiteboard } from "../simple-whiteboard";
import { WhiteboardTool, WhiteboardToolBuilder } from "./tool";
import { WhiteboardItem, WhiteboardItemType } from "./item";

export interface WhiteboardElementInterface {}

export abstract class WhiteboardElement<
    ToolType extends WhiteboardTool<WhiteboardItem<WhiteboardItemType>>
  >
  extends LitElement
  implements WhiteboardElementInterface
{
  private simpleWhiteboardInstance?: SimpleWhiteboard;
  private toolBuilder: WhiteboardToolBuilder<ToolType>;
  private tool?: ToolType;

  constructor(toolBuilder: WhiteboardToolBuilder<ToolType>) {
    super();

    this.toolBuilder = toolBuilder;
  }

  /**
   * Get the `SimpleWhiteboard` instance.
   *
   * @returns The current `SimpleWhiteboard` instance.
   */
  public getSimpleWhiteboardInstance(): SimpleWhiteboard {
    if (!this.simpleWhiteboardInstance) {
      throw new Error("The SimpleWhiteboard instance is not available yet.");
    }

    return this.simpleWhiteboardInstance;
  }

  /**
   * Get the tool instance.
   *
   * @returns The current tool instance.
   */
  public getTool(): ToolType {
    if (!this.tool) {
      throw new Error("The tool instance is not available yet.");
    }

    return this.tool;
  }

  /**
   * Get the nearest `SimpleWhiteboard` element as parent.
   *
   * @returns The nearest `SimpleWhiteboard` element or `null` if not found.
   */
  protected lookupSimpleWhiteboardInstance(): SimpleWhiteboard | null {
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
    // Just make sure that we can have a reference to the SimpleWhiteboard instance
    const simpleWhiteboardInstance = this.lookupSimpleWhiteboardInstance();
    if (!simpleWhiteboardInstance) {
      throw new Error(
        "The element must be a child of a SimpleWhiteboard element."
      );
    }
    this.simpleWhiteboardInstance = simpleWhiteboardInstance;
    this.tool = this.toolBuilder(this.simpleWhiteboardInstance);
    this.simpleWhiteboardInstance.registerTool(this.tool);
  }
}
