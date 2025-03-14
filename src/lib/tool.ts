import { TemplateResult } from "lit";
import { SimpleWhiteboard } from "../simple-whiteboard";
import {
  ExportedWhiteboardItem,
  WhiteboardItem,
  WhiteboardItemType,
} from "./item";

export type WhiteboardToolBuilder<
  ToolType extends WhiteboardTool<WhiteboardItem<WhiteboardItemType>>
> = (simpleWhiteboardInstance: SimpleWhiteboard) => ToolType;

export interface WhiteboardToolInterface<
  ItemType extends WhiteboardItem<WhiteboardItemType>
> {
  getSimpleWhiteboardInstance(): SimpleWhiteboard;
  getIcon: () => TemplateResult | null;
  getName: () => string;
  import(item: ExportedWhiteboardItem<WhiteboardItemType>): ItemType;
  renderToolOptions(_item: ItemType | null): TemplateResult | null;

  handleMouseMove(e: MouseEvent): void;

  handleDrawingStart(x: number, y: number): void;
  handleDrawingMove(x: number, y: number): void;
  handleDrawingEnd(): void;

  onToolSelected(): void;
}

export abstract class WhiteboardTool<
  ItemType extends WhiteboardItem<WhiteboardItemType>
> implements WhiteboardToolInterface<ItemType>
{
  private simpleWhiteboardInstance: SimpleWhiteboard;
  protected newItem: (item: WhiteboardItemType, id?: string) => ItemType;

  constructor(
    simpleWhiteboardInstance: SimpleWhiteboard,
    itemBuilder: (item: any, id?: string) => ItemType
  ) {
    this.simpleWhiteboardInstance = simpleWhiteboardInstance;
    this.newItem = itemBuilder;
  }

  /**
   * Get the `SimpleWhiteboard` instance.
   *
   * @returns The current `SimpleWhiteboard` instance.
   */
  public getSimpleWhiteboardInstance(): SimpleWhiteboard {
    return this.simpleWhiteboardInstance;
  }

  /**
   * Get the icon of the tool.
   * Return `null` if the tool does not have an icon.
   *
   * @returns The icon of the tool.
   */
  public getIcon(): TemplateResult | null {
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
  public getName(): string {
    return this.constructor.name.toLowerCase();
  }

  /**
   * Import the item from a JSON object.
   *
   * @param item The exported item.
   * @returns The imported item.
   */
  public import(item: ExportedWhiteboardItem<WhiteboardItemType>): ItemType {
    return this.newItem(item.data, item.id);
  }

  /**
   * Render the tool options.
   * This method should be implemented in the tool class if needed.
   * The tool options are the settings that the user can change for the tool.
   * It should return a template result with the options or `null` if not needed.
   * The `item` parameter is the selected item on the canvas ; it can be `null` if no item is selected, in that case you can assume it's for a new item.
   *
   * @param _item The selected item on the canvas or `null` if no item is selected.
   * @returns The template result with the tool options or `null` if not needed.
   */
  public renderToolOptions(_item: ItemType | null): TemplateResult | null {
    return null;
  }

  /**
   * Called when the mouse is pressed to start drawing.
   * This method should be implemented in the tool class if needed.
   *
   * @param _x The x coordinate of the mouse.
   * @param _y The y coordinate of the mouse.
   */
  public handleDrawingStart(_x: number, _y: number): void {
    // Implement this method in the tool class if needed.
  }

  /**
   * Called when the mouse moves.
   * This method should be implemented in the tool class if needed.
   *
   * @param _e The mouse event.
   */
  public handleMouseMove(_e: MouseEvent): void {
    // Implement this method in the tool class if needed.
  }

  /**
   * Called when the mouse moves while drawing.
   * This method should be implemented in the tool class if needed.
   *
   * @param _x The x coordinate of the mouse.
   * @param _y The y coordinate of the mouse.
   */
  public handleDrawingMove(_x: number, _y: number): void {
    // Implement this method in the tool class if needed.
  }

  /**
   * Called when the mouse is released to end drawing.
   * This method should be implemented in the tool class if needed.
   */
  public handleDrawingEnd(): void {
    // Implement this method in the tool class if needed.
  }

  /**
   * Called when the tool is selected.
   * This method should be implemented in the tool class if needed.
   */
  public onToolSelected(): void {
    // Implement this method in the tool class if needed.
  }
}
