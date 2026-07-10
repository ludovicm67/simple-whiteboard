import { clamp } from "../lib/geometry.ts";
import type { WhiteboardTool } from "../lib/tool";
import type {
  ExportedWhiteboardItem,
  WhiteboardItem,
  WhiteboardItemType,
} from "../lib/item";

/**
 * The slice of the whiteboard the item store needs to keep the UI in sync,
 * notify listeners, record undo steps and resolve tools when importing.
 */
export interface ItemStoreHost {
  requestUpdate(): void;
  draw(): void;
  dispatchEvent(event: Event): boolean;
  commitHistory(): void;
  /** `true` during a pointer interaction (drawing/dragging). */
  isInteracting(): boolean;
  /** `true` while the history is restoring a snapshot. */
  isRestoringHistory(): boolean;
  /** Make the current state the new history baseline. */
  resetHistoryBaseline(): void;
  /** Resolve a registered tool by its name/type (used when importing). */
  getToolInstance(
    type: string
  ): WhiteboardTool<WhiteboardItem<WhiteboardItemType>> | undefined;
}

/**
 * The whiteboard's data model: the list of items (in stacking order) plus the
 * selection and hover state.
 *
 * It owns every create/read/update/delete and stacking-order operation, emits
 * the `items-updated` events and records undo steps, and asks the host to
 * redraw / re-render as needed. The component exposes thin public methods that
 * delegate here, so its API is unchanged.
 */
export class ItemStore {
  private items: WhiteboardItem<WhiteboardItemType>[] = [];
  private selectedItemId: string | null = null;
  private hoveredItemId: string | null = null;

  private readonly host: ItemStoreHost;

  // Note: an explicit field + assignment (rather than a TypeScript "parameter
  // property") so this module stays runnable under `node --test`, which strips
  // types but does not support non-erasable syntax.
  constructor(host: ItemStoreHost) {
    this.host = host;
  }

  // --- Reads -----------------------------------------------------------------

  getItems(): WhiteboardItem<WhiteboardItemType>[] {
    return this.items;
  }

  exportItems(): ExportedWhiteboardItem<WhiteboardItemType>[] {
    return this.items.map((item) => item.export());
  }

  getItemIndexById(itemId: string): number | null {
    const index = this.items.findIndex((item) => item.getId() === itemId);
    return index === -1 ? null : index;
  }

  getItemById(itemId: string): WhiteboardItem<WhiteboardItemType> | null {
    const index = this.getItemIndexById(itemId);
    return index === null ? null : this.items[index];
  }

  // --- Import / export -------------------------------------------------------

  importItem(
    item: ExportedWhiteboardItem<WhiteboardItemType>,
    shouldThrow = false
  ): WhiteboardItem<WhiteboardItemType> | null {
    const tool = this.host.getToolInstance(item.type);
    if (!tool) {
      if (shouldThrow) {
        throw new Error(`Tool not found: ${item.type}`);
      }
      console.error(`Tool not found: ${item.type} ; skipping item`);
      return null;
    }
    const newItem = tool.import(item);
    if (newItem) {
      this.items.push(newItem);
      this.host.draw();
    }
    return newItem;
  }

  importItems(
    items: ExportedWhiteboardItem<WhiteboardItemType>[],
    shouldThrow = false
  ): void {
    this.items = items
      .map((item) => this.importItem(item, shouldThrow))
      .filter((item): item is WhiteboardItem<WhiteboardItemType> => item !== null);

    // Loading a fresh set of items becomes the new history baseline (unless we
    // are ourselves restoring a snapshot, in which case history is driving).
    if (!this.host.isRestoringHistory()) {
      this.host.resetHistoryBaseline();
    }
  }

  setItems(items: WhiteboardItem<WhiteboardItemType>[]): void {
    this.items = items;
    this.host.draw();
  }

  // --- Create / update / delete ----------------------------------------------

  addItem(item: WhiteboardItem<WhiteboardItemType>, sendEvent = true): void {
    this.items.push(item);
    this.host.draw();

    if (sendEvent) {
      this.host.dispatchEvent(
        new CustomEvent("items-updated", {
          detail: { type: "add", item: item.export() },
        })
      );
    }

    // Adds outside a pointer interaction (e.g. inserting a picture) are
    // committed right away; adds during an interaction are committed once at the
    // end of that interaction instead.
    if (!this.host.isInteracting()) {
      this.host.commitHistory();
    }
  }

  updateItem(itemId: string, item: WhiteboardItem<WhiteboardItemType>): void {
    const index = this.getItemIndexById(itemId);
    if (index === null) {
      return;
    }
    this.items[index] = item;
    this.host.draw();
  }

  updateItemById(
    itemId: string,
    item: WhiteboardItem<WhiteboardItemType>,
    sendEvent = false
  ): void {
    const index = this.getItemIndexById(itemId);
    if (index === null) {
      return;
    }
    this.items[index] = item;
    this.host.draw();

    if (sendEvent) {
      this.host.dispatchEvent(
        new CustomEvent("items-updated", {
          detail: { type: "update", itemId, item },
        })
      );
    }
    this.host.requestUpdate();
  }

  partialItemUpdateById(
    itemId: string,
    updates: Partial<WhiteboardItemType>,
    sendEvent = true
  ): void {
    const index = this.getItemIndexById(itemId);
    if (index === null) {
      return;
    }
    this.items[index].partialUpdate(updates);
    this.host.draw();
    this.host.requestUpdate();

    if (sendEvent) {
      this.host.dispatchEvent(
        new CustomEvent("items-updated", {
          detail: { type: "partial-update", itemId, updates },
        })
      );
    }
  }

  /**
   * Remove an item by its ID.
   *
   * @param itemId The ID of the item to remove.
   * @param sendEvent Whether to notify listeners of the removal.
   */
  removeItemById(itemId: string, sendEvent = false): void {
    const index = this.getItemIndexById(itemId);
    if (index === null) {
      return;
    }

    // Remove the item from the list and run its cleanup callback.
    this.items.splice(index, 1).forEach((item) => item.onRemove());
    this.host.draw();

    if (sendEvent) {
      this.host.dispatchEvent(
        new CustomEvent("items-updated", {
          detail: { type: "remove", itemId },
        })
      );

      // A local removal is undoable (remote ones, with `sendEvent = false`, are
      // not recorded locally). Removals during a pointer interaction (e.g.
      // dragging the eraser across several items) are committed once at the end
      // of the interaction, so the whole stroke is a single undo step.
      if (!this.host.isInteracting()) {
        this.host.commitHistory();
      }
    }

    this.host.requestUpdate();
  }

  /**
   * Dispose every item (running their cleanup) and clear the selection.
   */
  reset(): void {
    this.items.forEach((item) => item.onRemove());
    this.items = [];
    this.selectedItemId = null;
    this.host.requestUpdate();
  }

  // --- Selection / hover -----------------------------------------------------

  setSelectedItemId(itemId: string | null): void {
    this.selectedItemId = itemId;
    this.host.requestUpdate();
  }

  getSelectedItemId(): string | null {
    return this.selectedItemId;
  }

  getSelectedItem(): WhiteboardItem<WhiteboardItemType> | null {
    return this.selectedItemId ? this.getItemById(this.selectedItemId) : null;
  }

  setHoveredItemId(itemId: string | null): void {
    if (itemId !== this.hoveredItemId) {
      this.hoveredItemId = itemId;
      this.host.draw();
      this.host.requestUpdate();
    }
  }

  getHoveredItemId(): string | null {
    return this.hoveredItemId;
  }

  getHoveredItem(): WhiteboardItem<WhiteboardItemType> | null {
    return this.hoveredItemId ? this.getItemById(this.hoveredItemId) : null;
  }

  // --- Stacking order (z-order) ----------------------------------------------
  //
  // Items are drawn in array order: the first is at the back, the last on top.
  // Reordering the array changes which item is drawn over which.

  moveItemToIndex(itemId: string, toIndex: number, sendEvent = true): void {
    const fromIndex = this.getItemIndexById(itemId);
    if (fromIndex === null) {
      return;
    }

    const target = clamp(toIndex, 0, this.items.length - 1);
    if (target === fromIndex) {
      return;
    }

    const [item] = this.items.splice(fromIndex, 1);
    this.items.splice(target, 0, item);
    this.host.draw();
    this.host.requestUpdate();

    if (sendEvent) {
      this.host.dispatchEvent(
        new CustomEvent("items-updated", {
          detail: {
            type: "reorder",
            itemId,
            toIndex: target,
            // Full resulting order, so remote clients can reproduce it robustly.
            order: this.items.map((current) => current.getId()),
          },
        })
      );
      this.host.commitHistory();
    }
  }

  moveItemForward(itemId: string, sendEvent = true): void {
    const index = this.getItemIndexById(itemId);
    if (index === null) {
      return;
    }
    this.moveItemToIndex(itemId, index + 1, sendEvent);
  }

  moveItemBackward(itemId: string, sendEvent = true): void {
    const index = this.getItemIndexById(itemId);
    if (index === null) {
      return;
    }
    this.moveItemToIndex(itemId, index - 1, sendEvent);
  }

  bringItemToFront(itemId: string, sendEvent = true): void {
    this.moveItemToIndex(itemId, this.items.length - 1, sendEvent);
  }

  sendItemToBack(itemId: string, sendEvent = true): void {
    this.moveItemToIndex(itemId, 0, sendEvent);
  }

  /**
   * Reorder every item to match the given list of IDs. Items whose ID is not in
   * the list keep their relative order and are appended at the end. Used to
   * apply a stacking-order change coming from another client.
   */
  applyItemsOrder(orderIds: string[], sendEvent = false): void {
    const byId = new Map(this.items.map((item) => [item.getId(), item]));
    const reordered: WhiteboardItem<WhiteboardItemType>[] = [];

    for (const id of orderIds) {
      const item = byId.get(id);
      if (item) {
        reordered.push(item);
        byId.delete(id);
      }
    }
    // Keep any items that were not referenced in the order.
    for (const item of this.items) {
      if (byId.has(item.getId())) {
        reordered.push(item);
      }
    }

    this.items = reordered;
    this.host.draw();
    this.host.requestUpdate();

    if (sendEvent) {
      this.host.dispatchEvent(
        new CustomEvent("items-updated", {
          detail: {
            type: "reorder",
            order: this.items.map((item) => item.getId()),
          },
        })
      );
      this.host.commitHistory();
    }
  }
}
