import { LitElement, TemplateResult } from "lit";
import { SimpleWhiteboard } from "../simple-whiteboard";
import { RoughCanvas as LocalRoughCanvas } from "roughjs/bin/canvas";
import { Options as LocalRoughCanvasOptions } from "roughjs/bin/core";

export interface WhiteboardItem {
  kind: string;
  id: string;
  options: Record<string, any>;
}

export type BoundingRect = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export interface SimpleWhiteboardToolInterface {
  getSimpleWhiteboardInstance(): SimpleWhiteboard | null;
  getToolIcon: () => TemplateResult | null;
  getToolName: () => string;
  lookupSimpleWhiteboardInstance(): SimpleWhiteboard | null;
  drawItem(
    rc: RoughCanvas,
    context: CanvasRenderingContext2D,
    item: WhiteboardItem
  ): void;
  getBoundingRect(item: WhiteboardItem): BoundingRect | null;
}

export type RoughCanvas = LocalRoughCanvas;
export type RoughCanvasOptions = LocalRoughCanvasOptions;

abstract class SimpleWhiteboardTool
  extends LitElement
  implements SimpleWhiteboardToolInterface
{
  private simpleWhiteboardInstance: SimpleWhiteboard | null = null;

  /**
   * Get the `SimpleWhiteboard` instance.
   *
   * @returns The current `SimpleWhiteboard` instance or `null` if not found.
   */
  public getSimpleWhiteboardInstance(): SimpleWhiteboard | null {
    return this.simpleWhiteboardInstance;
  }

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
   * Get the nearest `SimpleWhiteboard` element as parent.
   *
   * @returns The nearest `SimpleWhiteboard` element or `null` if not found.
   */
  public lookupSimpleWhiteboardInstance(): SimpleWhiteboard | null {
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

  /**
   * Draw the item on the canvas.
   * This method should be implemented in the tool class if needed.
   * If the tool does not need to draw anything, you can leave it empty.
   *
   * @param _rc The rough canvas instance.
   * @param _context The canvas rendering context.
   * @param _item The item to draw.
   */
  public drawItem(
    _rc: RoughCanvas,
    _context: CanvasRenderingContext2D,
    _item: WhiteboardItem
  ): void {
    // Implement this method in the tool class to draw the item if needed.
  }

  /**
   * Get the bounding rect of the item.
   * This method should be implemented in the tool class if needed.
   * The bounding rect is used to calculate the size of the item on the canvas.
   * It should be the smallest rectangle that contains the item.
   *
   * @param _item The item to get the bounding rect.
   * @returns The bounding rect of the item or `null` if not needed.
   */
  public getBoundingRect(_item: WhiteboardItem): BoundingRect | null {
    // Implement this method in the tool class to get the bounding rect of the item if needed.
    return null;
  }

  protected firstUpdated(): void {
    const simpleWhiteboard = this.lookupSimpleWhiteboardInstance();
    if (simpleWhiteboard) {
      this.simpleWhiteboardInstance = simpleWhiteboard;
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
