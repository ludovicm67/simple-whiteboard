import { WhiteboardItem, WhiteboardItemType } from "../../lib/item";

export const MOVE_ITEM_TYPE = "move";

export const itemBuilder = (item: MoveItemType, id?: string) =>
  new MoveItem(item, id);

/**
 * Type for a move item.
 */
export interface MoveItemType extends WhiteboardItemType {}

/**
 * Class for a move item.
 */
export class MoveItem extends WhiteboardItem<MoveItemType> {
  constructor(item: MoveItemType, id?: string) {
    super(item, id);
  }

  /**
   * Get the type of the item.
   *
   * @returns The type of the item.
   */
  public override getType(): string {
    return MOVE_ITEM_TYPE;
  }
}
