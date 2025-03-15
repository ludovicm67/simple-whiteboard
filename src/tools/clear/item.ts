import {
  ExportedWhiteboardItem,
  WhiteboardItem,
  WhiteboardItemType,
} from "../../lib/item";

export const CLEAR_ITEM_TYPE = "clear";

export const itemBuilder = (item: ClearItemType, id?: string) =>
  new ClearItem(item, id);

/**
 * Type for a clear item.
 */
export interface ClearItemType extends WhiteboardItemType {}

/**
 * Class for a clear item.
 */
export class ClearItem extends WhiteboardItem<ClearItemType> {
  constructor(item: ClearItemType, id?: string) {
    super(item, id);
  }

  /**
   * Get the type of the item.
   *
   * @returns The type of the item.
   */
  public override getType(): string {
    return CLEAR_ITEM_TYPE;
  }

  /**
   * Export the clear item to a JSON object.
   *
   * @returns The exported clear item.
   */
  public override export(): ExportedWhiteboardItem<ClearItemType> {
    return {
      id: this.getId(),
      type: this.getType(),
      data: {},
    };
  }
}
