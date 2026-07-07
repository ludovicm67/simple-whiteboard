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
