import { test } from "node:test";
import assert from "node:assert/strict";
import {
  clamp,
  distance,
  midpoint,
  rectsIntersect,
  dotGridPositions,
} from "../src/lib/geometry.ts";

test("clamp keeps values within the range", () => {
  assert.equal(clamp(5, 0, 10), 5);
  assert.equal(clamp(-1, 0, 10), 0);
  assert.equal(clamp(11, 0, 10), 10);
});

test("distance computes the Euclidean distance", () => {
  assert.equal(distance({ x: 0, y: 0 }, { x: 3, y: 4 }), 5);
  assert.equal(distance({ x: 1, y: 1 }, { x: 1, y: 1 }), 0);
});

test("midpoint returns the point halfway between two points", () => {
  assert.deepEqual(midpoint({ x: 0, y: 0 }, { x: 10, y: 20 }), {
    x: 5,
    y: 10,
  });
});

test("rectsIntersect detects overlapping rectangles", () => {
  const a = { x: 0, y: 0, width: 10, height: 10 };
  assert.equal(
    rectsIntersect(a, { x: 5, y: 5, width: 10, height: 10 }),
    true,
    "overlapping"
  );
  assert.equal(
    rectsIntersect(a, { x: 2, y: 2, width: 2, height: 2 }),
    true,
    "contained"
  );
  assert.equal(
    rectsIntersect(a, { x: 10, y: 0, width: 5, height: 5 }),
    true,
    "touching edge counts as intersecting"
  );
  assert.equal(
    rectsIntersect(a, { x: 20, y: 20, width: 5, height: 5 }),
    false,
    "disjoint"
  );
});

test("dotGridPositions returns the visible grid points", () => {
  const camera = { panX: 0, panY: 0, offsetX: 0, offsetY: 0, zoom: 1 };
  const points = dotGridPositions(camera, {
    width: 100,
    height: 100,
    spacing: 50,
    minScreenSpacing: 10,
  });

  // Grid points at 0, 50 and 100 on both axes -> 3 x 3 = 9 dots.
  assert.equal(points.length, 9);
  assert.ok(points.some((p) => p.x === 0 && p.y === 0));
  assert.ok(points.some((p) => p.x === 100 && p.y === 100));
});

test("dotGridPositions increases spacing when zoomed out to stay bounded", () => {
  const camera = { panX: 0, panY: 0, offsetX: 0, offsetY: 0, zoom: 0.1 };

  const points = dotGridPositions(camera, {
    width: 100,
    height: 100,
    spacing: 50,
    minScreenSpacing: 10,
  });

  // 50 * 0.1 = 5px would be too dense, so the spacing doubles to 100 world
  // units (10px on screen). That yields 11 x 11 = 121 visible dots instead of
  // the 441 an un-adapted grid would produce.
  assert.equal(points.length, 121);

  // The on-screen spacing between consecutive dots is at least minScreenSpacing.
  const xs = [...new Set(points.map((p) => p.x))].sort((a, b) => a - b);
  assert.ok(xs[1] - xs[0] >= 10);
});

test("dotGridPositions only returns points inside the viewport", () => {
  // Pan so that the world origin sits far off the left edge.
  const camera = { panX: -1000, panY: 0, offsetX: 0, offsetY: 0, zoom: 1 };
  const points = dotGridPositions(camera, {
    width: 100,
    height: 100,
    spacing: 50,
    minScreenSpacing: 10,
  });

  for (const point of points) {
    assert.ok(point.x >= 0 && point.x <= 100);
    assert.ok(point.y >= 0 && point.y <= 100);
  }
});

test("dotGridPositions returns nothing for degenerate input", () => {
  const camera = { panX: 0, panY: 0, offsetX: 0, offsetY: 0, zoom: 1 };
  assert.deepEqual(
    dotGridPositions(camera, { width: 0, height: 100, spacing: 50 }),
    []
  );
  assert.deepEqual(
    dotGridPositions(
      { ...camera, zoom: 0 },
      { width: 100, height: 100, spacing: 50 }
    ),
    []
  );
});
