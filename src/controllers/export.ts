import rough from "roughjs";
import { CoordsContext } from "../lib/coords";
import { WhiteboardItem, WhiteboardItemType } from "../lib/item";
import { BoundingRect, DrawingContext, Point } from "../lib/types";
import { rectsIntersect } from "../lib/geometry";
import { drawDottedBackground } from "../lib/background";
import {
  downloadCanvasAsPng,
  CanvasPngExportOptions,
} from "../lib/canvasExport";

/**
 * The slice of the whiteboard that the export controller needs.
 */
export interface ExportHost {
  getItems(): WhiteboardItem<WhiteboardItemType>[];
  getCoordsContext(): CoordsContext;
  /** Whether the dotted background is enabled (drawn behind exported content). */
  readonly dottedBackground: boolean;
  /** Export the on-screen canvas as-is (used as the empty-board fallback). */
  downloadCurrentCanvasAsPng(options?: CanvasPngExportOptions): void;
  draw(): void;
  requestUpdate(): void;
  setCursor(cursor: string): void;
}

/** Largest side (in pixels) an exported image may reach. */
const MAX_EXPORT_DIMENSION = 4096;

/**
 * Owns PNG export beyond the plain "current view": exporting the whole board
 * ("full view") and an interactively selected region ("selected area"),
 * including the marquee gesture and its overlay.
 *
 * Both full-view and area exports re-render the items (and the dotted
 * background) onto a detached canvas through a dedicated coordinate system, so
 * the result is independent of the current pan/zoom and never includes the
 * selection/hover boxes or tool overlays.
 */
export class ExportController {
  // Area-selection gesture state (canvas pixels).
  private selecting = false;
  private start: Point | null = null;
  private current: Point | null = null;
  private options: CanvasPngExportOptions = {};

  constructor(private readonly host: ExportHost) {}

  /**
   * Whether an "export selected area" gesture is currently in progress.
   */
  get isSelectingArea(): boolean {
    return this.selecting;
  }

  // --- Full view -------------------------------------------------------------

  /**
   * Export every item on the board, framed to their combined bounding box —
   * regardless of the current pan/zoom. Falls back to the current view when the
   * board is empty.
   */
  downloadFullView(options?: CanvasPngExportOptions): void {
    const bbox = this.getItemsBoundingBox();
    if (!bbox) {
      this.host.downloadCurrentCanvasAsPng(options);
      return;
    }

    const canvas = this.renderRegionToCanvas(bbox, {
      scale: this.scaleFor(bbox),
      padding: 24,
    });
    downloadCanvasAsPng(canvas, options);
    canvas.remove();
    // Re-render on-screen: the off-screen pass may have touched transient item
    // state (e.g. a text item's editing flag).
    this.host.draw();
  }

  // --- Arbitrary region ------------------------------------------------------

  /**
   * Export an arbitrary world-space region as a PNG.
   */
  downloadRegion(worldRect: BoundingRect, options?: CanvasPngExportOptions): void {
    if (worldRect.width <= 0 || worldRect.height <= 0) {
      return;
    }
    const canvas = this.renderRegionToCanvas(worldRect, {
      scale: this.scaleFor(worldRect),
      padding: 0,
    });
    downloadCanvasAsPng(canvas, options);
    canvas.remove();
    this.host.draw();
  }

  // --- Selected area (interactive) -------------------------------------------

  /**
   * Enter "export a selected area" mode: the next pointer drag draws a
   * rectangle, and releasing exports that region as a PNG.
   */
  startAreaExport(options?: CanvasPngExportOptions): void {
    this.options = options ?? {};
    this.selecting = true;
    this.start = null;
    this.current = null;
    this.host.setCursor("crosshair");
    this.host.draw();
    this.host.requestUpdate();
  }

  /**
   * Cancel an in-progress "export selected area" gesture without exporting.
   */
  cancelAreaExport(): void {
    this.exitAreaExport();
  }

  /**
   * Begin the marquee at a canvas-space point.
   */
  pointerDown(x: number, y: number): void {
    this.start = { x, y };
    this.current = { x, y };
    this.host.draw();
  }

  /**
   * Update the marquee's far corner while dragging.
   */
  pointerMove(x: number, y: number): void {
    if (!this.start) {
      return;
    }
    this.current = { x, y };
    this.host.draw();
  }

  /**
   * Finish the gesture: export the picked region (unless it is too small to be
   * intentional) and leave the mode.
   */
  pointerUp(): void {
    const start = this.start;
    const current = this.current;
    const options = this.options;
    this.exitAreaExport();

    if (!start || !current) {
      return;
    }

    const x1 = Math.min(start.x, current.x);
    const y1 = Math.min(start.y, current.y);
    const x2 = Math.max(start.x, current.x);
    const y2 = Math.max(start.y, current.y);

    // Ignore an accidental click or a tiny selection.
    if (x2 - x1 < 4 || y2 - y1 < 4) {
      return;
    }

    const coords = this.host.getCoordsContext();
    const topLeft = coords.convertFromCanvas(x1, y1);
    const bottomRight = coords.convertFromCanvas(x2, y2);
    this.downloadRegion(
      {
        x: topLeft.x,
        y: topLeft.y,
        width: bottomRight.x - topLeft.x,
        height: bottomRight.y - topLeft.y,
      },
      options
    );
  }

  /**
   * Draw the "export a selected area" marquee: everything outside the picked
   * rectangle is dimmed, and the rectangle itself gets a dashed accent border.
   */
  drawMarquee(
    context: CanvasRenderingContext2D,
    width: number,
    height: number
  ): void {
    if (!this.selecting) {
      return;
    }

    context.save();

    // Before the first drag, dim the whole canvas as a hint that a region is
    // expected.
    if (!this.start || !this.current) {
      context.fillStyle = "rgba(15, 23, 42, 0.18)";
      context.fillRect(0, 0, width, height);
      context.restore();
      return;
    }

    const rx = Math.min(this.start.x, this.current.x);
    const ry = Math.min(this.start.y, this.current.y);
    const rw = Math.abs(this.current.x - this.start.x);
    const rh = Math.abs(this.current.y - this.start.y);

    // Dim everything around the selection (four bands), leaving it clear.
    context.fillStyle = "rgba(15, 23, 42, 0.28)";
    context.fillRect(0, 0, width, ry);
    context.fillRect(0, ry + rh, width, height - (ry + rh));
    context.fillRect(0, ry, rx, rh);
    context.fillRect(rx + rw, ry, width - (rx + rw), rh);

    // Dashed accent border around the selection.
    context.strokeStyle = "#135aa0";
    context.lineWidth = 1.5;
    context.setLineDash([6, 4]);
    context.strokeRect(rx + 0.5, ry + 0.5, rw, rh);

    context.restore();
  }

  // --- Internals -------------------------------------------------------------

  /**
   * Leave "export selected area" mode and reset its state.
   */
  private exitAreaExport(): void {
    this.selecting = false;
    this.start = null;
    this.current = null;
    this.host.setCursor("default");
    this.host.draw();
    this.host.requestUpdate();
  }

  /**
   * Compute the world-space bounding box that encloses every item, or `null`
   * when the board is empty.
   */
  private getItemsBoundingBox(): BoundingRect | null {
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    for (const item of this.host.getItems()) {
      const box = item.getBoundingBox();
      if (!box) {
        continue;
      }
      minX = Math.min(minX, box.x);
      minY = Math.min(minY, box.y);
      maxX = Math.max(maxX, box.x + box.width);
      maxY = Math.max(maxY, box.y + box.height);
    }

    if (!Number.isFinite(minX)) {
      return null;
    }
    return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
  }

  /**
   * Pick an output scale (pixels per world unit): 2x for crispness, but reduced
   * so the largest side never exceeds a sane limit. Zoom-independent, so the
   * same content always exports at the same resolution.
   */
  private scaleFor(rect: BoundingRect): number {
    const longestSide = Math.max(rect.width, rect.height) || 1;
    return Math.min(2, MAX_EXPORT_DIMENSION / longestSide);
  }

  /**
   * Render a world-space region onto a fresh, detached canvas and return it.
   */
  private renderRegionToCanvas(
    worldRect: BoundingRect,
    options: { scale?: number; padding?: number } = {}
  ): HTMLCanvasElement {
    const scale = options.scale ?? 2;
    const padding = options.padding ?? 0;

    // Expand the region by the padding (in world units).
    const region: BoundingRect = {
      x: worldRect.x - padding,
      y: worldRect.y - padding,
      width: worldRect.width + padding * 2,
      height: worldRect.height + padding * 2,
    };

    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(region.width * scale));
    canvas.height = Math.max(1, Math.round(region.height * scale));
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      return canvas;
    }

    // A temporary coordinate system that maps the region onto the output
    // canvas: the region's top-left world point maps to (0, 0), and one world
    // unit is `scale` output pixels.
    const coords = new CoordsContext();
    coords.setOffset(0, 0);
    coords.setZoom(scale);
    coords.setCoords(-region.x * scale, -region.y * scale);

    // Dotted background (if enabled), then every item that intersects the
    // region, in stacking order.
    if (this.host.dottedBackground) {
      drawDottedBackground(ctx, coords.toCamera(), canvas.width, canvas.height);
    }

    const roughCanvas = rough.canvas(canvas, { options: { seed: 42 } });
    const drawingContext: DrawingContext = { canvas: ctx, roughCanvas, coords };
    this.host.getItems().forEach((item) => {
      const box = item.getBoundingBox();
      if (box && !rectsIntersect(box, region)) {
        return;
      }
      item.draw(drawingContext);
    });

    return canvas;
  }
}
