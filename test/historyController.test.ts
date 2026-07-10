import { test } from "node:test";
import assert from "node:assert/strict";
import { HistoryController } from "../src/controllers/history.ts";

// A fake board whose "items" are just a list of strings. `exportItems` returns
// the current state and `importItems` replaces it, so undo/redo can be checked
// by round-tripping the state.
const makeHost = () => ({
  state: [] as string[],
  draws: 0,
  updates: 0,
  events: [] as any[],
  exportItems() {
    return [...this.state];
  },
  resetWhiteboard() {
    this.state = [];
  },
  importItems(items: string[]) {
    this.state = [...items];
  },
  draw() {
    this.draws++;
  },
  requestUpdate() {
    this.updates++;
  },
  dispatchEvent(e: any) {
    this.events.push(e.detail);
    return true;
  },
});

const typesOf = (host: ReturnType<typeof makeHost>) =>
  host.events.map((d) => d.type).filter(Boolean);

test("reset establishes a baseline that cannot be undone past", () => {
  const host = makeHost();
  const hc = new HistoryController(host as any);
  hc.reset();
  assert.equal(hc.canUndo(), false);
  assert.equal(hc.canRedo(), false);
  // A history-changed event is emitted on reset.
  assert.ok(host.events.some((e) => "canUndo" in e));
});

test("commit records a step only when the state changed", () => {
  const host = makeHost();
  const hc = new HistoryController(host as any);
  hc.reset();

  host.state = ["a"];
  hc.commit();
  assert.equal(hc.canUndo(), true);

  // Committing again with an unchanged state is a no-op.
  const before = host.events.length;
  hc.commit();
  assert.equal(host.events.length, before);
});

test("undo and redo round-trip the board state", () => {
  const host = makeHost();
  const hc = new HistoryController(host as any);
  hc.reset(); // baseline: []

  host.state = ["a"];
  hc.commit();
  host.state = ["a", "b"];
  hc.commit();

  hc.undo();
  assert.deepEqual(host.state, ["a"]);
  assert.equal(hc.canRedo(), true);

  hc.undo();
  assert.deepEqual(host.state, []);
  assert.equal(hc.canUndo(), false);

  hc.redo();
  assert.deepEqual(host.state, ["a"]);
  hc.redo();
  assert.deepEqual(host.state, ["a", "b"]);
  assert.equal(hc.canRedo(), false);
});

test("undo flushes a pending (uncommitted) change first, so it can be redone", () => {
  const host = makeHost();
  const hc = new HistoryController(host as any);
  hc.reset(); // baseline: []

  // Change the board but never call commit() explicitly.
  host.state = ["a"];
  hc.undo(); // should commit the pending ["a"] first, then undo to []
  assert.deepEqual(host.state, []);

  hc.redo();
  assert.deepEqual(host.state, ["a"]);
});

test("restoring dispatches a full-state 'set' event and a history-changed", () => {
  const host = makeHost();
  const hc = new HistoryController(host as any);
  hc.reset();
  host.state = ["a"];
  hc.commit();

  host.events.length = 0;
  hc.undo();

  const types = typesOf(host);
  assert.ok(types.includes("set"), "emits a 'set' items-updated event");
  assert.ok(
    host.events.some((e) => "canUndo" in e),
    "emits a history-changed event"
  );
});

test("isRestoring is false outside of a restore", () => {
  const host = makeHost();
  const hc = new HistoryController(host as any);
  hc.reset();
  assert.equal(hc.isRestoring, false);
  host.state = ["a"];
  hc.commit();
  hc.undo();
  assert.equal(hc.isRestoring, false);
});

test("a fresh push after an undo discards the redo branch", () => {
  const host = makeHost();
  const hc = new HistoryController(host as any);
  hc.reset(); // []
  host.state = ["a"];
  hc.commit();
  host.state = ["a", "b"];
  hc.commit();

  hc.undo(); // back to ["a"], redo available
  assert.equal(hc.canRedo(), true);

  host.state = ["a", "c"];
  hc.commit(); // new branch
  assert.equal(hc.canRedo(), false);

  hc.undo();
  assert.deepEqual(host.state, ["a"]);
});
