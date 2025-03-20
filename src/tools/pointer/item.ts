import {
  ExportedWhiteboardItem,
  WhiteboardItem,
  WhiteboardItemType,
} from "../../lib/item";

export const POINTER_ITEM_TYPE = "pointer";

export const itemBuilder = (item: PointerItemType, id?: string) =>
  new PointerItem(item, id);

/**
 * Type for a pointer item.
 */
export interface PointerItemType extends WhiteboardItemType {}

/**
 * Class for a pointer item.
 */
export class PointerItem extends WhiteboardItem<PointerItemType> {
  constructor(item: PointerItemType, id?: string) {
    super(item, id);
  }

  /**
   * Get the type of the item.
   *
   * @returns The type of the item.
   */
  public override getType(): string {
    return POINTER_ITEM_TYPE;
  }

  /**
   * Export the pointer item to a JSON object.
   *
   * @returns The exported pointer item.
   */
  public override export(): ExportedWhiteboardItem<PointerItemType> {
    return {
      id: this.getId(),
      type: this.getType(),
      data: {},
    };
  }
}
