import { test } from "node:test";
import assert from "node:assert/strict";
import { ItemStore } from "../src/controllers/items.ts";

// --- Minimal mocks ---------------------------------------------------------
//
// The store is exercised through a fake host (recording draws / updates /
// commits / dispatched events) and fake items (only the methods the store
// actually calls). Types are erased at runtime, so plain objects are fine.

const makeItem = (id: string, type = "mock") => ({
  getId: () => id,
  getType: () => type,
  export: () => ({ id, type, data: {} }),
  removed: false,
  onRemove() {
    this.removed = true;
  },
  getBoundingBox: () => null,
  lastUpdate: null as unknown,
  partialUpdate(updates: unknown) {
    this.lastUpdate = updates;
  },
});

const makeHost = () => ({
  draws: 0,
  updates: 0,
  commits: 0,
  baselineResets: 0,
  interacting: false,
  restoring: false,
  events: [] as any[],
  tools: new Map<string, { import: (e: any) => any }>(),
  requestUpdate() {
    this.updates++;
  },
  draw() {
    this.draws++;
  },
  dispatchEvent(e: any) {
    this.events.push(e.detail);
    return true;
  },
  commitHistory() {
    this.commits++;
  },
  isInteracting() {
    return this.interacting;
  },
  isRestoringHistory() {
    return this.restoring;
  },
  resetHistoryBaseline() {
    this.baselineResets++;
  },
  getToolInstance(type: string) {
    return this.tools.get(type);
  },
});

/** Build a store pre-populated with items of the given ids. */
const storeWith = (...ids: string[]) => {
  const host = makeHost();
  const store = new ItemStore(host as any);
  ids.forEach((id) => store.addItem(makeItem(id) as any));
  const ids0 = () => store.getItems().map((i) => i.getId());
  return { host, store, ids0 };
};

// --- Add / remove ----------------------------------------------------------

test("addItem appends, draws, emits an add event and commits when idle", () => {
  const host = makeHost();
  const store = new ItemStore(host as any);
  store.addItem(makeItem("a") as any);

  assert.deepEqual(
    store.getItems().map((i) => i.getId()),
    ["a"]
  );
  assert.equal(host.draws, 1);
  assert.equal(host.commits, 1);
  assert.equal(host.events.length, 1);
  assert.equal(host.events[0].type, "add");
});

test("addItem during an interaction does not commit (deferred to the end)", () => {
  const host = makeHost();
  host.interacting = true;
  const store = new ItemStore(host as any);
  store.addItem(makeItem("a") as any);
  assert.equal(host.commits, 0);
});

test("addItem with sendEvent=false stays silent", () => {
  const host = makeHost();
  const store = new ItemStore(host as any);
  store.addItem(makeItem("a") as any, false);
  assert.equal(host.events.length, 0);
  // Still committed (idle, not an interaction).
  assert.equal(host.commits, 1);
});

test("removeItemById removes, runs onRemove, emits and commits", () => {
  const { host, store } = storeWith("a", "b");
  host.events.length = 0;
  host.commits = 0;
  const b = store.getItemById("b") as any;

  store.removeItemById("b", true);

  assert.deepEqual(
    store.getItems().map((i) => i.getId()),
    ["a"]
  );
  assert.equal(b.removed, true);
  assert.equal(host.events.at(-1).type, "remove");
  assert.equal(host.commits, 1);
});

test("removeItemById is a no-op for an unknown id", () => {
  const { host, store } = storeWith("a");
  host.events.length = 0;
  store.removeItemById("nope", true);
  assert.equal(store.getItems().length, 1);
  assert.equal(host.events.length, 0);
});

test("removeItemById during an interaction does not commit", () => {
  const { host, store } = storeWith("a");
  host.commits = 0;
  host.interacting = true;
  store.removeItemById("a", true);
  assert.equal(host.commits, 0);
});

// --- Update ----------------------------------------------------------------

test("partialItemUpdateById forwards the patch and emits a partial-update", () => {
  const { host, store } = storeWith("a");
  host.events.length = 0;
  store.partialItemUpdateById("a", { x: 1 } as any);
  const a = store.getItemById("a") as any;
  assert.deepEqual(a.lastUpdate, { x: 1 });
  assert.equal(host.events.at(-1).type, "partial-update");
});

// --- Selection / hover -----------------------------------------------------

test("selection round-trips and requests an update", () => {
  const { host, store } = storeWith("a", "b");
  host.updates = 0;
  store.setSelectedItemId("b");
  assert.equal(host.updates, 1);
  assert.equal(store.getSelectedItemId(), "b");
  assert.equal((store.getSelectedItem() as any).getId(), "b");

  store.setSelectedItemId(null);
  assert.equal(store.getSelectedItem(), null);
});

test("hover only redraws when the id actually changes", () => {
  const { host, store } = storeWith("a");
  host.draws = 0;
  store.setHoveredItemId("a");
  store.setHoveredItemId("a"); // unchanged -> no extra draw
  assert.equal(host.draws, 1);
  assert.equal((store.getHoveredItem() as any).getId(), "a");
});

// --- Import filtering ------------------------------------------------------

test("importItems keeps items with a known tool and skips unknown ones", () => {
  const host = makeHost();
  host.tools.set("rect", { import: (e: any) => makeItem(e.id, "rect") });
  const store = new ItemStore(host as any);

  const silence = console.error;
  console.error = () => {};
  store.importItems([
    { id: "a", type: "rect", data: {} },
    { id: "b", type: "ghost", data: {} }, // unknown tool -> skipped
    { id: "c", type: "rect", data: {} },
  ] as any);
  console.error = silence;

  assert.deepEqual(
    store.getItems().map((i) => i.getId()),
    ["a", "c"]
  );
  // Loading a fresh set resets the history baseline (we are not restoring).
  assert.equal(host.baselineResets, 1);
});

test("importItems does not reset the baseline while restoring", () => {
  const host = makeHost();
  host.restoring = true;
  host.tools.set("rect", { import: (e: any) => makeItem(e.id, "rect") });
  const store = new ItemStore(host as any);
  store.importItems([{ id: "a", type: "rect", data: {} }] as any);
  assert.equal(host.baselineResets, 0);
});

test("importItem throws for an unknown tool when shouldThrow is set", () => {
  const host = makeHost();
  const store = new ItemStore(host as any);
  assert.throws(
    () => store.importItem({ id: "a", type: "ghost", data: {} } as any, true),
    /Tool not found: ghost/
  );
});

// --- Stacking order (z-order) ----------------------------------------------

test("moveItemToIndex moves an item and reports the new order", () => {
  const { host, store, ids0 } = storeWith("a", "b", "c");
  host.events.length = 0;
  store.moveItemToIndex("a", 2);
  assert.deepEqual(ids0(), ["b", "c", "a"]);
  const ev = host.events.at(-1);
  assert.equal(ev.type, "reorder");
  assert.deepEqual(ev.order, ["b", "c", "a"]);
});

test("moveItemToIndex clamps out-of-range targets", () => {
  {
    const { store, ids0 } = storeWith("a", "b", "c");
    store.moveItemToIndex("a", 99);
    assert.deepEqual(ids0(), ["b", "c", "a"]);
  }
  {
    const { store, ids0 } = storeWith("a", "b", "c");
    store.moveItemToIndex("c", -5);
    assert.deepEqual(ids0(), ["c", "a", "b"]);
  }
});

test("moveItemToIndex is a no-op when the target equals the current index", () => {
  const { host, store, ids0 } = storeWith("a", "b", "c");
  host.events.length = 0;
  host.commits = 0;
  store.moveItemToIndex("b", 1);
  assert.deepEqual(ids0(), ["a", "b", "c"]);
  assert.equal(host.events.length, 0);
  assert.equal(host.commits, 0);
});

test("forward / backward / front / back move by the expected amount", () => {
  const { store, ids0 } = storeWith("a", "b", "c");
  store.moveItemForward("a"); // [b, a, c]
  assert.deepEqual(ids0(), ["b", "a", "c"]);
  store.moveItemBackward("a"); // [a, b, c]
  assert.deepEqual(ids0(), ["a", "b", "c"]);
  store.bringItemToFront("a"); // [b, c, a]
  assert.deepEqual(ids0(), ["b", "c", "a"]);
  store.sendItemToBack("a"); // [a, b, c]
  assert.deepEqual(ids0(), ["a", "b", "c"]);
});

test("applyItemsOrder reorders by id and appends unreferenced items", () => {
  const { store, ids0 } = storeWith("a", "b", "c");
  // Only "c" is referenced: it moves to the front, the rest keep their order.
  store.applyItemsOrder(["c"]);
  assert.deepEqual(ids0(), ["c", "a", "b"]);

  store.applyItemsOrder(["a", "b", "c"]);
  assert.deepEqual(ids0(), ["a", "b", "c"]);

  // Unknown ids in the order are ignored.
  store.applyItemsOrder(["b", "zzz", "a"]);
  assert.deepEqual(ids0(), ["b", "a", "c"]);
});

test("applyItemsOrder emits a reorder event only when asked", () => {
  const { host, store } = storeWith("a", "b", "c");
  host.events.length = 0;
  store.applyItemsOrder(["c", "b", "a"]); // sendEvent defaults to false here
  assert.equal(host.events.length, 0);

  store.applyItemsOrder(["a", "b", "c"], true);
  assert.equal(host.events.at(-1).type, "reorder");
});
