import { test } from "node:test";
import assert from "node:assert/strict";
import { getSvgPathFromStroke } from "../src/lib/svg.ts";

test("returns an empty string when there are fewer than 4 points", () => {
  assert.equal(getSvgPathFromStroke([]), "");
  assert.equal(getSvgPathFromStroke([[0, 0]]), "");
  assert.equal(
    getSvgPathFromStroke([
      [0, 0],
      [1, 1],
      [2, 2],
    ]),
    ""
  );
});

test("builds a closed quadratic path by default", () => {
  const path = getSvgPathFromStroke([
    [0, 0],
    [10, 0],
    [10, 10],
    [0, 10],
    [0, 0],
  ]);

  assert.ok(path.startsWith("M0.00,0.00"), "starts with a move command");
  assert.ok(path.includes("Q"), "contains a quadratic curve command");
  assert.ok(path.endsWith("Z"), "is closed by default");
});

test("does not close the path when closed is false", () => {
  const path = getSvgPathFromStroke(
    [
      [0, 0],
      [10, 0],
      [10, 10],
      [0, 10],
      [0, 0],
    ],
    false
  );

  assert.ok(path.startsWith("M"));
  assert.ok(!path.trimEnd().endsWith("Z"), "is left open");
});
