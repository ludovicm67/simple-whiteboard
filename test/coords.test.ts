import { test } from "node:test";
import assert from "node:assert/strict";
import { CoordsContext } from "../src/lib/coords.ts";

test("defaults to identity transform", () => {
  const coords = new CoordsContext();
  assert.deepEqual(coords.convertToCanvas(10, 20), { x: 10, y: 20 });
  assert.deepEqual(coords.convertFromCanvas(10, 20), { x: 10, y: 20 });
  assert.equal(coords.getZoom(), 1);
});

test("applies the offset when converting coordinates", () => {
  const coords = new CoordsContext();
  coords.setOffset(100, 50);
  assert.deepEqual(coords.convertToCanvas(0, 0), { x: 100, y: 50 });
  assert.deepEqual(coords.convertFromCanvas(100, 50), { x: 0, y: 0 });
  assert.deepEqual(coords.getOffset(), { x: 100, y: 50 });
});

test("convertToCanvas and convertFromCanvas are inverse of each other", () => {
  const coords = new CoordsContext(10, 20, 2);
  coords.setOffset(100, 50);

  const canvasPoint = coords.convertToCanvas(5, 7);
  assert.deepEqual(canvasPoint, { x: 5 * 2 + 10 + 100, y: 7 * 2 + 20 + 50 });

  const worldPoint = coords.convertFromCanvas(canvasPoint.x, canvasPoint.y);
  assert.deepEqual(worldPoint, { x: 5, y: 7 });
});

test("toCamera exposes a plain snapshot of the transform", () => {
  const coords = new CoordsContext(3, 4, 1.5);
  coords.setOffset(20, 30);
  assert.deepEqual(coords.toCamera(), {
    panX: 3,
    panY: 4,
    offsetX: 20,
    offsetY: 30,
    zoom: 1.5,
  });
});

test("getVisibleWorldRect returns the visible area in world coordinates", () => {
  const coords = new CoordsContext();
  coords.setOffset(400, 300); // centered origin, like the real component

  const rect = coords.getVisibleWorldRect(800, 600);
  assert.deepEqual(rect, { x: -400, y: -300, width: 800, height: 600 });
});

test("getVisibleWorldRect accounts for zoom", () => {
  const coords = new CoordsContext();
  coords.setZoom(2);

  const rect = coords.getVisibleWorldRect(800, 600);
  // At 2x zoom, half as much of the world is visible.
  assert.equal(rect.width, 400);
  assert.equal(rect.height, 300);
});

test("reset restores pan and zoom but keeps the offset", () => {
  const coords = new CoordsContext(50, 60, 3);
  coords.setOffset(100, 100);
  coords.reset();

  assert.deepEqual(coords.getCoords(), { x: 0, y: 0 });
  assert.equal(coords.getZoom(), 1);
  assert.deepEqual(coords.getOffset(), { x: 100, y: 100 });
});
