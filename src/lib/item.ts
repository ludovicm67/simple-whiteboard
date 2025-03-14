import { v4 as uuidv4 } from "uuid";
import { DrawingContext } from "./types";

/**
 * Interface for the type of a whiteboard item.
 */
export interface WhiteboardItemType {}

/**
 * Interface for the exported whiteboard item.
 * This is used to export the whiteboard item to a JSON object.
 */
export interface ExportedWhiteboardItem<T extends WhiteboardItemType> {
  id: string;
  type: string;
  data: T;
}

/**
 * Interface for a whiteboard item.
 */
export interface WhiteboardItemInterface<T extends WhiteboardItemType> {
  getId(): string;
  setId(id: string): void;
  getType(): string;
  export(): ExportedWhiteboardItem<T>;
  partialUpdate(item: T): void;
  update(item: T): void;
  draw(context: DrawingContext): void;
}

/**
 * Class for a whiteboard item.
 */
export abstract class WhiteboardItem<T extends WhiteboardItemType>
  implements WhiteboardItemInterface<T>
{
  private id: string;

  constructor(_item: WhiteboardItemType, id?: string) {
    this.id = id ?? uuidv4();
  }

  /**
   * Get the id of the item.
   *
   * @returns The id of the item.
   */
  public getId(): string {
    return this.id;
  }

  /**
   * Set the id of the item.
   *
   * @param id The id of the item.
   */
  public setId(id: string): void {
    this.id = id;
  }

  /**
   * Get the type of the item.
   *
   * @returns The type of the item.
   */
  public getType(): string {
    return this.constructor.name;
  }

  /**
   * Export the item to a JSON object.
   *
   * @returns The exported item.
   */
  public export(): ExportedWhiteboardItem<T> {
    return {
      id: this.id,
      type: this.getType(),
      data: {} as T,
    };
  }

  /**
   * Updates all properties of the item with the ones that are passed in.
   * This doesn't override other properties that are not passed in.
   *
   * @param _item item with the properties to update.
   */
  public partialUpdate(_item: Partial<T>): void {
    // To be implemented by the subclass
  }

  /**
   * Updates all properties of the item with the ones that are passed in.
   * This overrides all properties with the ones that are passed in.
   *
   * @param _item item with all the properties.
   */
  public update(_item: T): void {
    // To be implemented by the subclass
  }

  /**
   * Draw the item on the canvas.
   *
   * @param _context The drawing context.
   */
  public draw(_context: DrawingContext): void {
    // To be implemented by the subclass
  }
}
