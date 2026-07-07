import type { Point } from "./types";

/**
 * Axis-aligned rectangle expressed in a single coordinate space.
 */
export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Camera describing how world coordinates map to canvas (screen) coordinates.
 * This mirrors the maths implemented by `CoordsContext`, but as a plain data
 * object so that it can be reasoned about (and unit-tested) in isolation.
 */
export interface Camera {
  /** Pan offset on the x-axis (in canvas pixels). */
  panX: number;
  /** Pan offset on the y-axis (in canvas pixels). */
  panY: number;
  /** Origin offset on the x-axis, used to keep (0, 0) at the canvas center. */
  offsetX: number;
  /** Origin offset on the y-axis, used to keep (0, 0) at the canvas center. */
  offsetY: number;
  /** Zoom level (1 = 100%). */
  zoom: number;
}

/**
 * Clamp a value into the inclusive `[min, max]` range.
 *
 * @param value The value to clamp.
 * @param min The lower bound.
 * @param max The upper bound.
 * @returns The clamped value.
 */
export const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value));

/**
 * Compute the Euclidean distance between two points.
 *
 * @param a The first point.
 * @param b The second point.
 * @returns The distance between the two points.
 */
export const distance = (a: Point, b: Point): number => {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
};

/**
 * Compute the midpoint between two points.
 *
 * @param a The first point.
 * @param b The second point.
 * @returns The point located halfway between `a` and `b`.
 */
export const midpoint = (a: Point, b: Point): Point => ({
  x: (a.x + b.x) / 2,
  y: (a.y + b.y) / 2,
});

/**
 * Determine whether two axis-aligned rectangles overlap.
 * Shared edges are treated as an overlap so that items sitting exactly on the
 * viewport border are never mistakenly culled.
 *
 * @param a The first rectangle.
 * @param b The second rectangle.
 * @returns `true` if the rectangles intersect, `false` otherwise.
 */
export const rectsIntersect = (a: Rect, b: Rect): boolean =>
  a.x <= b.x + b.width &&
  a.x + a.width >= b.x &&
  a.y <= b.y + b.height &&
  a.y + a.height >= b.y;

/**
 * Compute the shortest distance from a point to a line segment.
 *
 * The point is projected onto the segment's supporting line, clamped to the
 * segment's extremities, and the distance to that closest point is returned.
 *
 * @param p The point.
 * @param a The first endpoint of the segment.
 * @param b The second endpoint of the segment.
 * @returns The distance from `p` to the closest point on segment `[a, b]`.
 */
export const distanceToSegment = (p: Point, a: Point, b: Point): number => {
  const abx = b.x - a.x;
  const aby = b.y - a.y;
  const lengthSquared = abx * abx + aby * aby;

  // Degenerate segment (a == b): fall back to a point-to-point distance.
  if (lengthSquared === 0) {
    return distance(p, a);
  }

  // Projection of `p` onto the line, clamped to the `[a, b]` segment.
  const t = clamp(
    ((p.x - a.x) * abx + (p.y - a.y) * aby) / lengthSquared,
    0,
    1
  );
  const closest = { x: a.x + t * abx, y: a.y + t * aby };
  return distance(p, closest);
};

/**
 * Determine whether a circle overlaps an axis-aligned rectangle.
 * A circle that merely touches the rectangle counts as overlapping.
 *
 * @param cx The x-coordinate of the circle center.
 * @param cy The y-coordinate of the circle center.
 * @param radius The radius of the circle.
 * @param rect The rectangle.
 * @returns `true` if the circle and rectangle overlap, `false` otherwise.
 */
export const circleIntersectsRect = (
  cx: number,
  cy: number,
  radius: number,
  rect: Rect
): boolean => {
  // Closest point of the rectangle to the circle center.
  const closestX = clamp(cx, rect.x, rect.x + rect.width);
  const closestY = clamp(cy, rect.y, rect.y + rect.height);
  const dx = cx - closestX;
  const dy = cy - closestY;
  return dx * dx + dy * dy <= radius * radius;
};

/**
 * Options describing the dotted background grid to compute.
 */
export interface DotGridOptions {
  /** Canvas width in pixels. */
  width: number;
  /** Canvas height in pixels. */
  height: number;
  /** Spacing between two dots, expressed in world units. */
  spacing: number;
  /**
   * Minimum allowed on-screen spacing (in pixels). When zooming out far enough
   * that dots would get closer than this, the world spacing is doubled so the
   * grid stays readable and the number of dots stays bounded.
   */
  minScreenSpacing?: number;
}

/**
 * Compute the on-screen positions of the dotted-background grid points that
 * fall inside the current viewport.
 *
 * The grid is defined in world space so it pans and zooms together with the
 * content. Only the points visible on the canvas are returned, and the spacing
 * is adaptively increased when the zoomed-out grid would become too dense.
 * This keeps the amount of work bounded regardless of the zoom level, so
 * nothing off-screen is ever computed or drawn (CPU optimization).
 *
 * @param camera The current camera (pan/offset/zoom).
 * @param options The dotted grid options.
 * @returns The list of visible dot positions, in canvas coordinates.
 */
export const dotGridPositions = (
  camera: Camera,
  options: DotGridOptions
): Point[] => {
  const { width, height, spacing } = options;
  const minScreenSpacing = options.minScreenSpacing ?? 16;
  const { zoom } = camera;

  if (spacing <= 0 || zoom <= 0 || width <= 0 || height <= 0) {
    return [];
  }

  // Adaptively grow the world spacing until the on-screen spacing is large
  // enough. This bounds the number of dots even when zoomed far out.
  let worldSpacing = spacing;
  while (worldSpacing * zoom < minScreenSpacing) {
    worldSpacing *= 2;
  }

  // World-space coordinates of the visible canvas corners.
  const minWorldX = (0 - camera.panX - camera.offsetX) / zoom;
  const maxWorldX = (width - camera.panX - camera.offsetX) / zoom;
  const minWorldY = (0 - camera.panY - camera.offsetY) / zoom;
  const maxWorldY = (height - camera.panY - camera.offsetY) / zoom;

  const startI = Math.ceil(minWorldX / worldSpacing);
  const endI = Math.floor(maxWorldX / worldSpacing);
  const startJ = Math.ceil(minWorldY / worldSpacing);
  const endJ = Math.floor(maxWorldY / worldSpacing);

  const points: Point[] = [];
  for (let i = startI; i <= endI; i++) {
    const screenX = i * worldSpacing * zoom + camera.panX + camera.offsetX;
    for (let j = startJ; j <= endJ; j++) {
      const screenY = j * worldSpacing * zoom + camera.panY + camera.offsetY;
      points.push({ x: screenX, y: screenY });
    }
  }
  return points;
};
