import { Camera, dotGridPositions } from "./geometry";

/**
 * Options for the dotted background.
 */
export interface DottedBackgroundOptions {
  /** Color of the dots. */
  color?: string;
  /** Radius of each dot, in pixels. */
  radius?: number;
  /** Spacing between two dots, in world units. */
  spacing?: number;
  /** Minimum on-screen spacing before the grid gets sparser (see geometry). */
  minScreenSpacing?: number;
}

/**
 * Draw a dotted grid background on the canvas.
 *
 * Only the dots that are actually visible are drawn, and they are batched into
 * a single `Path2D` so the whole grid is painted with one `fill()` call. This
 * keeps the cost low and bounded even during pan/zoom interactions.
 *
 * @param ctx The 2D canvas rendering context to draw on.
 * @param camera The current camera (pan/offset/zoom).
 * @param width The canvas width, in pixels.
 * @param height The canvas height, in pixels.
 * @param options The dotted background options.
 */
export const drawDottedBackground = (
  ctx: CanvasRenderingContext2D,
  camera: Camera,
  width: number,
  height: number,
  options: DottedBackgroundOptions = {}
): void => {
  const color = options.color ?? "#d7dbe3";
  const radius = options.radius ?? 1;
  const spacing = options.spacing ?? 24;
  const minScreenSpacing = options.minScreenSpacing ?? 20;

  const points = dotGridPositions(camera, {
    width,
    height,
    spacing,
    minScreenSpacing,
  });
  if (points.length === 0) {
    return;
  }

  // Batch every dot into a single path so we only issue one fill call.
  const TWO_PI = Math.PI * 2;
  const path = new Path2D();
  for (const { x, y } of points) {
    // `moveTo` before each arc prevents connecting lines between the dots.
    path.moveTo(x + radius, y);
    path.arc(x, y, radius, 0, TWO_PI);
  }

  ctx.save();
  ctx.fillStyle = color;
  ctx.fill(path);
  ctx.restore();
};
