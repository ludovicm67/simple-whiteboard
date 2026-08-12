/**
 * Small drawing helpers shared by the renderer and the items, plus the sizes of
 * the selection UI that both the renderer (which draws it) and the pointer tool
 * (which lets you grab it) need to agree on.
 */

/** Size, in canvas pixels, of the square resize handles. */
export const RESIZE_HANDLE_SIZE = 9;

/**
 * Size, in canvas pixels, of the area that grabs a resize handle. It is a bit
 * larger than the handle itself so that handles stay comfortable to hit — with
 * a mouse or a finger — at any zoom level.
 */
export const RESIZE_HANDLE_HIT_SIZE = 18;

/**
 * Draw a rounded rectangle path on the given context.
 *
 * The path is only built, not painted: it is up to the caller to `fill()`
 * and/or `stroke()` it.
 */
export const roundedRectPath = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number
): void => {
  const r = Math.max(0, Math.min(radius, width / 2, height / 2));
  // `roundRect` is available in every evergreen browser; fall back just in case.
  if (typeof ctx.roundRect === "function") {
    ctx.beginPath();
    ctx.roundRect(x, y, width, height, r);
    return;
  }
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + width, y, x + width, y + height, r);
  ctx.arcTo(x + width, y + height, x, y + height, r);
  ctx.arcTo(x, y + height, x, y, r);
  ctx.arcTo(x, y, x + width, y, r);
  ctx.closePath();
};
