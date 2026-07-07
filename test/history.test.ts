import { test } from "node:test";
import assert from "node:assert/strict";
import { HistoryStack } from "../src/lib/history.ts";

test("starts empty and cannot undo or redo", () => {
  const h = new HistoryStack<string>();
  assert.equal(h.canUndo(), false);
  assert.equal(h.canRedo(), false);
  assert.equal(h.current(), undefined);
});

test("reset sets a baseline that cannot be undone past", () => {
  const h = new HistoryStack<string>();
  h.reset("a");
  assert.equal(h.current(), "a");
  assert.equal(h.canUndo(), false);
  assert.equal(h.canRedo(), false);
});

test("push records new states and enables undo", () => {
  const h = new HistoryStack<string>();
  h.reset("a");
  assert.equal(h.push("b"), true);
  assert.equal(h.current(), "b");
  assert.equal(h.canUndo(), true);
  assert.equal(h.canRedo(), false);
});

test("push is a no-op when the state is unchanged", () => {
  const h = new HistoryStack<string>();
  h.reset("a");
  assert.equal(h.push("a"), false);
  assert.equal(h.size(), 1);
  assert.equal(h.canUndo(), false);
});

test("undo and redo move through the states", () => {
  const h = new HistoryStack<string>();
  h.reset("a");
  h.push("b");
  h.push("c");

  assert.equal(h.undo(), "b");
  assert.equal(h.undo(), "a");
  assert.equal(h.canUndo(), false);
  assert.equal(h.undo(), undefined, "cannot undo past the baseline");

  assert.equal(h.redo(), "b");
  assert.equal(h.redo(), "c");
  assert.equal(h.canRedo(), false);
  assert.equal(h.redo(), undefined, "cannot redo past the latest state");
});

test("pushing after an undo discards the redo branch", () => {
  const h = new HistoryStack<string>();
  h.reset("a");
  h.push("b");
  h.push("c");

  h.undo(); // back to "b"
  assert.equal(h.canRedo(), true);

  h.push("d"); // new branch from "b"
  assert.equal(h.current(), "d");
  assert.equal(h.canRedo(), false, "old redo branch is gone");

  assert.equal(h.undo(), "b");
  assert.equal(h.redo(), "d");
});

test("enforces the size limit by dropping the oldest entries", () => {
  const h = new HistoryStack<number>({ limit: 3 });
  h.reset(0);
  h.push(1);
  h.push(2);
  h.push(3); // exceeds limit of 3 -> "0" is dropped

  assert.equal(h.size(), 3);
  assert.equal(h.current(), 3);

  // We can only undo back to "1" now, "0" was dropped.
  assert.equal(h.undo(), 2);
  assert.equal(h.undo(), 1);
  assert.equal(h.canUndo(), false);
});

test("uses a custom equality function", () => {
  const h = new HistoryStack<{ v: number }>({
    isEqual: (a, b) => a.v === b.v,
  });
  h.reset({ v: 1 });
  assert.equal(h.push({ v: 1 }), false, "equal by value -> no-op");
  assert.equal(h.push({ v: 2 }), true);
});
