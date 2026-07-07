import { html, TemplateResult } from "lit";
import { unsafeHTML } from "lit/directives/unsafe-html.js";
import { WhiteboardTool } from "../../lib/tool";
import { getIconSvg } from "../../lib/icons";
import { EraserItem } from "./item";
import { DrawingContext, Point } from "../../lib/types";

export const ERASER_TOOL_NAME = "eraser";

// Eraser diameter range (in world units) exposed through the size slider.
const MIN_ERASER_SIZE = 10;
const MAX_ERASER_SIZE = 120;
const DEFAULT_ERASER_SIZE = 40;

/**
 * Object eraser.
 *
 * Instead of painting over the canvas (which only ever worked when the eraser
 * color happened to match the background), this tool removes the items it
 * touches. Dragging across the board erases every item under the eraser circle,
 * exactly like erasing on a real whiteboard, and the whole stroke is a single,
 * undoable step that is also propagated through the `items-updated` events so it
 * stays in sync with other clients.
 */
export class EraserTool extends WhiteboardTool<EraserItem> {
  // Diameter of the eraser, in world units.
  private size = DEFAULT_ERASER_SIZE;

  // Whether a press-and-drag erase gesture is currently in progress.
  private isErasing = false;

  // Last erased point (world coordinates), used to erase continuously along the
  // drag so a fast movement does not skip items between two pointer events.
  private lastPoint: Point | null = null;

  // Last known pointer position (world coordinates), used to draw the eraser
  // cursor circle. `null` when the pointer is not over the canvas.
  private cursorPoint: Point | null = null;

  /**
   * Get the icon of the tool.
   *
   * @returns The icon of the tool.
   */
  public override getIcon(): TemplateResult | null {
    return html`${unsafeHTML(getIconSvg("Eraser"))}`;
  }

  /**
   * Get the name of the tool.
   *
   * @returns The name of the tool.
   */
  public override getName(): string {
    return ERASER_TOOL_NAME;
  }

  /**
   * Convert a canvas point to world coordinates.
   */
  private toWorld(x: number, y: number): Point {
    return this.getSimpleWhiteboardInstance()
      .getCoordsContext()
      .convertFromCanvas(x, y);
  }

  /**
   * Remove every item touched by an eraser circle of the current radius,
   * centered on the given world-space point.
   *
   * @param x The x-coordinate of the eraser center, in world coordinates.
   * @param y The y-coordinate of the eraser center, in world coordinates.
   */
  private eraseAtPoint(x: number, y: number): void {
    const whiteboard = this.getSimpleWhiteboardInstance();
    const radius = this.size / 2;

    // Collect first, then remove: removing mutates the items array.
    const hitItems = whiteboard
      .getItems()
      .filter((item) => item.isHitByEraser(x, y, radius));

    for (const item of hitItems) {
      whiteboard.removeItemById(item.getId(), true);
    }
  }

  /**
   * Erase along the segment between two world-space points, sampling closely
   * enough that a fast drag never leaves a gap between two pointer events.
   *
   * @param from The start of the segment, in world coordinates.
   * @param to The end of the segment, in world coordinates.
   */
  private eraseAlongSegment(from: Point, to: Point): void {
    const radius = this.size / 2;
    const dist = Math.hypot(to.x - from.x, to.y - from.y);
    // One sample every half-radius keeps the sampled circles overlapping.
    const step = Math.max(radius / 2, 1);
    const steps = Math.max(1, Math.ceil(dist / step));

    // Start at 1: the `from` point was already erased by the previous event.
    for (let i = 1; i <= steps; i++) {
      const t = i / steps;
      this.eraseAtPoint(from.x + (to.x - from.x) * t, from.y + (to.y - from.y) * t);
    }
  }

  public override handleDrawingStart(x: number, y: number): void {
    const point = this.toWorld(x, y);
    this.isErasing = true;
    this.lastPoint = point;
    this.cursorPoint = point;
    this.eraseAtPoint(point.x, point.y);
    this.getSimpleWhiteboardInstance().draw();
  }

  public override handleDrawingMove(x: number, y: number): void {
    const point = this.toWorld(x, y);
    this.cursorPoint = point;

    if (this.isErasing && this.lastPoint) {
      this.eraseAlongSegment(this.lastPoint, point);
      this.lastPoint = point;
    }

    // Redraw so the eraser cursor follows the pointer (whether erasing or just
    // hovering).
    this.getSimpleWhiteboardInstance().draw();
  }

  public override handleDrawingEnd(): void {
    this.isErasing = false;
    this.lastPoint = null;
    this.getSimpleWhiteboardInstance().draw();
  }

  /**
   * Draw the eraser cursor: a dashed circle showing the area that will be
   * erased, so the user knows exactly how big the eraser is.
   */
  public override drawOverlay(context: DrawingContext): void {
    if (!this.cursorPoint) {
      return;
    }

    const { x, y } = context.coords.convertToCanvas(
      this.cursorPoint.x,
      this.cursorPoint.y
    );
    const radius = (this.size / 2) * context.coords.getZoom();
    const ctx = context.canvas;

    ctx.save();
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(19, 90, 160, 0.08)";
    ctx.fill();
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = "rgba(19, 90, 160, 0.9)";
    ctx.setLineDash([4, 4]);
    ctx.stroke();
    ctx.restore();
  }

  public override renderToolOptions(): TemplateResult | null {
    const whiteboard = this.getSimpleWhiteboardInstance();
    const i18n = whiteboard.getI18nContext();

    return html`
      <p>${i18n.t("tool-options-size")}</p>
      <input
        class="width-100-percent"
        type="range"
        min=${MIN_ERASER_SIZE}
        max=${MAX_ERASER_SIZE}
        step="5"
        .value=${String(this.size)}
        @input=${(e: Event) => {
          const target = e.target as HTMLInputElement;
          this.size = parseInt(target.value, 10);
          // Redraw so the eraser cursor reflects the new size immediately.
          whiteboard.draw();
        }}
      />
    `;
  }

  public override onToolSelected(): void {
    super.onToolSelected();
    // A precise crosshair pairs with the drawn eraser circle.
    this.getSimpleWhiteboardInstance().setCursor("crosshair");
  }

  public override onToolUnselected(): void {
    super.onToolUnselected();
    // Stop drawing the eraser cursor and restore the default pointer.
    this.cursorPoint = null;
    this.isErasing = false;
    this.lastPoint = null;
    const whiteboard = this.getSimpleWhiteboardInstance();
    whiteboard.setCursor("default");
    whiteboard.draw();
  }
}
