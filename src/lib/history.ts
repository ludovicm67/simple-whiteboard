/**
 * Options for a {@link HistoryStack}.
 */
export interface HistoryStackOptions<T> {
  /**
   * Maximum number of entries to keep. When the limit is exceeded, the oldest
   * entries are dropped. Defaults to `50`.
   */
  limit?: number;
  /**
   * Equality check used to avoid pushing a new entry that is identical to the
   * current one. Defaults to strict equality (`===`), which is what you want
   * when the snapshots are serialized strings.
   */
  isEqual?: (a: T, b: T) => boolean;
}

/**
 * A generic undo/redo history, modeled as a list of snapshots with a cursor.
 *
 * `entries[index]` is always the current state. Pushing a new state drops any
 * "redo" branch (entries after the cursor), appends the state and advances the
 * cursor. Undo/redo simply move the cursor and return the state to restore.
 *
 * The class is deliberately state-agnostic (it stores whatever `T` you give it)
 * so it can be unit-tested in isolation, independently of the whiteboard.
 */
export class HistoryStack<T> {
  private entries: T[] = [];
  private index = -1;
  private readonly limit: number;
  private readonly isEqual: (a: T, b: T) => boolean;

  constructor(options: HistoryStackOptions<T> = {}) {
    this.limit = options.limit ?? 50;
    this.isEqual = options.isEqual ?? ((a, b) => a === b);
  }

  /**
   * Reset the history to a single baseline entry. Nothing can be undone past
   * this point.
   *
   * @param initial The baseline state.
   */
  public reset(initial: T): void {
    this.entries = [initial];
    this.index = 0;
  }

  /**
   * Get the current state, or `undefined` if the history is empty.
   */
  public current(): T | undefined {
    return this.index >= 0 ? this.entries[this.index] : undefined;
  }

  /**
   * Push a new state.
   *
   * If it is equal to the current state, nothing happens (so repeated commits
   * of an unchanged board are free). Otherwise the redo branch is discarded and
   * the state becomes the new current entry.
   *
   * @param state The new state to record.
   * @returns `true` if a new entry was added, `false` if it was a no-op.
   */
  public push(state: T): boolean {
    if (this.index >= 0 && this.isEqual(this.entries[this.index], state)) {
      return false;
    }

    // Drop any redo branch, then append the new state.
    this.entries = this.entries.slice(0, this.index + 1);
    this.entries.push(state);
    this.index = this.entries.length - 1;

    // Enforce the size limit by dropping the oldest entries.
    if (this.entries.length > this.limit) {
      const overflow = this.entries.length - this.limit;
      this.entries.splice(0, overflow);
      this.index -= overflow;
    }

    return true;
  }

  /**
   * Whether there is a state to undo to.
   */
  public canUndo(): boolean {
    return this.index > 0;
  }

  /**
   * Whether there is a state to redo to.
   */
  public canRedo(): boolean {
    return this.index < this.entries.length - 1;
  }

  /**
   * Move the cursor back one step.
   *
   * @returns The state to restore, or `undefined` if there is nothing to undo.
   */
  public undo(): T | undefined {
    if (!this.canUndo()) {
      return undefined;
    }
    this.index--;
    return this.entries[this.index];
  }

  /**
   * Move the cursor forward one step.
   *
   * @returns The state to restore, or `undefined` if there is nothing to redo.
   */
  public redo(): T | undefined {
    if (!this.canRedo()) {
      return undefined;
    }
    this.index++;
    return this.entries[this.index];
  }

  /**
   * The number of entries currently kept in the history.
   */
  public size(): number {
    return this.entries.length;
  }
}
