import { HistoryStack } from "../lib/history.ts";
import type { ExportedWhiteboardItem, WhiteboardItemType } from "../lib/item";

/**
 * The slice of the whiteboard that the history controller needs to read the
 * current state, rebuild it from a snapshot, and notify listeners.
 */
export interface HistoryHost {
  /** Serialize every item to plain JSON (the snapshotted state). */
  exportItems(): ExportedWhiteboardItem<WhiteboardItemType>[];
  /** Dispose the current items (and their DOM overlays). */
  resetWhiteboard(): void;
  /** Rebuild the board from exported items. */
  importItems(items: ExportedWhiteboardItem<WhiteboardItemType>[]): void;
  draw(): void;
  requestUpdate(): void;
  dispatchEvent(event: Event): boolean;
}

/**
 * Owns the undo/redo history for a whiteboard.
 *
 * Each history entry is a JSON snapshot of the exported items. The controller
 * keeps the {@link HistoryStack} and the "restoring" flag out of the component,
 * which now only delegates its public `undo`/`redo`/`commitHistory`/… methods
 * here.
 */
export class HistoryController {
  private readonly history = new HistoryStack<string>({ limit: 50 });

  // `true` while a snapshot is being restored, so the restore is not itself
  // recorded as a new history entry. Read by the host's `importItems` to avoid
  // resetting the history baseline mid-restore.
  private restoring = false;

  private readonly host: HistoryHost;

  // Note: an explicit field + assignment (rather than a TypeScript "parameter
  // property") so this module stays runnable under `node --test`, which strips
  // types but does not support non-erasable syntax.
  constructor(host: HistoryHost) {
    this.host = host;
  }

  /**
   * Whether a snapshot is currently being restored.
   */
  get isRestoring(): boolean {
    return this.restoring;
  }

  /**
   * Serialize the current board state to a comparable snapshot.
   */
  private snapshot(): string {
    return JSON.stringify(this.host.exportItems());
  }

  /**
   * Reset the history so the current state becomes the baseline; nothing before
   * it can be undone.
   */
  reset(): void {
    this.history.reset(this.snapshot());
    this.host.requestUpdate();
    this.dispatchChanged();
  }

  /**
   * Record the current board state as a new undo step. Does nothing if the
   * state has not changed, or while a snapshot is being restored.
   */
  commit(): void {
    if (this.restoring) {
      return;
    }
    if (this.history.push(this.snapshot())) {
      this.host.requestUpdate();
      this.dispatchChanged();
    }
  }

  /**
   * Whether there is a change that can be undone.
   */
  canUndo(): boolean {
    return this.history.canUndo();
  }

  /**
   * Whether there is a change that can be redone.
   */
  canRedo(): boolean {
    return this.history.canRedo();
  }

  /**
   * Undo the last change.
   */
  undo(): void {
    // Flush any pending change first, so it can be redone afterwards.
    this.commit();
    const snapshot = this.history.undo();
    if (snapshot !== undefined) {
      this.restore(snapshot);
    }
  }

  /**
   * Redo the last undone change.
   */
  redo(): void {
    this.commit();
    const snapshot = this.history.redo();
    if (snapshot !== undefined) {
      this.restore(snapshot);
    }
  }

  /**
   * Restore the board to a previously recorded snapshot.
   */
  private restore(snapshot: string): void {
    this.restoring = true;
    // Dispose the current items first so their DOM overlays (e.g. the text
    // editor) are cleaned up, then rebuild from the snapshot.
    this.host.resetWhiteboard();
    const items = JSON.parse(snapshot) as ExportedWhiteboardItem<
      WhiteboardItemType
    >[];
    this.host.importItems(items);
    this.restoring = false;
    this.host.draw();
    this.host.requestUpdate();

    // Let hosts (e.g. a collaborative layer) react to the full new state.
    this.host.dispatchEvent(
      new CustomEvent("items-updated", {
        detail: { type: "set", items: this.host.exportItems() },
      })
    );
    this.dispatchChanged();
  }

  /**
   * Notify listeners that the undo/redo availability changed.
   */
  private dispatchChanged(): void {
    this.host.dispatchEvent(
      new CustomEvent("history-changed", {
        detail: { canUndo: this.canUndo(), canRedo: this.canRedo() },
      })
    );
  }
}
