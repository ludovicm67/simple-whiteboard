import { test } from "node:test";
import assert from "node:assert/strict";
import { throttle } from "../src/lib/time.ts";

test("runs the leading call immediately", () => {
  let calls = 0;
  const throttled = throttle(() => {
    calls++;
  }, 100);

  throttled();
  assert.equal(calls, 1);
});

test("forwards arguments and preserves `this`", () => {
  const received: unknown[] = [];
  const context = { value: 42 };
  const throttled = throttle(function (this: typeof context, a: number) {
    received.push([this.value, a]);
  }, 100);

  throttled.call(context, 7);
  assert.deepEqual(received, [[42, 7]]);
});

test("coalesces rapid calls and runs a single trailing call", (t) => {
  t.mock.timers.enable({ apis: ["setTimeout", "Date"] });

  let calls = 0;
  const throttled = throttle(() => {
    calls++;
  }, 100);

  throttled(); // leading call runs right away
  throttled();
  throttled();
  throttled(); // these are collapsed into one trailing call
  assert.equal(calls, 1, "only the leading call has run so far");

  t.mock.timers.tick(100);
  assert.equal(calls, 2, "the trailing call runs after the window elapses");
});
