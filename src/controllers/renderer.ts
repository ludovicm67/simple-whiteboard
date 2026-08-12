import rough from "roughjs";
import { CoordsContext } from "../lib/coords";
import { WhiteboardItem, WhiteboardItemType } from "../lib/item";
import { DrawingContext } from "../lib/types";
import { rectsIntersect } from "../lib/geometry";
import { drawDottedBackground } from "../lib/background";
import { RESIZE_HANDLE_SIZE, roundedRectPath } from "../lib/canvas";

/**
 * Padding (in canvas pixels) added around an item's bounding box when drawing
 * its hover/selection box. It gives the box a bit of breathing room, and covers
 * the few pixels by which the sketchy (Rough.js) strokes wobble outside of the
 * exact geometry they are drawn from. Being expressed in canvas pixels, it
 * stays visually constant at any zoom level — just like that wobble.
 */
const BOX_PADDING = 4;

/** Corner radius of the boxes, matching the `--sw-radius-sm` token. */
const BOX_RADIUS = 6;

/** Thickness of the box outline, in canvas pixels. */
const BOX_LINE_WIDTH = 1.5;

/**
 * A wider, very transparent stroke drawn under the selection outline: it lifts
 * the box off busy content the same way the floating panels use a soft shadow.
 */
const BOX_HALO_LINE_WIDTH = 5;
const BOX_HALO_ALPHA = 0.14;

/** Opacity of the hover box, which stays quieter than the selection. */
const HOVER_ALPHA = 0.4;

/** Fill of an idle resize handle. */
const HANDLE_FILL = "#fff";

/** Corner radius of the resize handles, in canvas pixels. */
const HANDLE_RADIUS = 2.5;

/** How much a hovered resize handle grows, in canvas pixels. */
const HANDLE_HOVER_GROWTH = 2;

/** Accent color used when the `--sw-accent` token cannot be resolved. */
const DEFAULT_ACCENT = "#135aa0";

/**
 * The slice of the whiteboard that the renderer needs.
 */
export interface RendererHost {
  getCanvasElement(): HTMLCanvasElement | undefined;
  getCoordsContext(): CoordsContext;
  getItems(): WhiteboardItem<WhiteboardItemType>[];
  readonly dottedBackground: boolean;
  getSelectedItemId(): string | null;
  getSelectedItem(): WhiteboardItem<WhiteboardItemType> | null;
  getHoveredItem(): WhiteboardItem<WhiteboardItemType> | null;
  /** Name of the resize handle the pointer is currently over, if any. */
  getHoveredResizeHandle(): string | null;
  /**
   * Draw transient overlays (the active tool's overlay, the export marquee, …)
   * on top of the items and the selection boxes. Called at the end of a render.
   */
  drawOverlays(
    drawingContext: DrawingContext,
    context: CanvasRenderingContext2D,
    width: number,
    height: number
  ): void;
}

/**
 * Renders the whiteboard onto its canvas and coalesces redraws.
 *
 * Multiple {@link draw} calls within the same animation frame collapse into a
 * single render (CPU optimization), and items whose bounding box lies entirely
 * outside the viewport are skipped (viewport culling).
 */
export class CanvasRenderer {
  // Used to coalesce redraws into a single render per frame.
  private scheduled = false;
  private rafId = 0;

  constructor(private readonly host: RendererHost) {}

  /**
   * Request a redraw. Redraws are coalesced with `requestAnimationFrame`, so
   * many calls within the same frame result in a single render.
   */
  draw(): void {
    if (this.scheduled) {
      return;
    }
    this.scheduled = true;
    this.rafId = requestAnimationFrame(() => {
      this.scheduled = false;
      this.render();
    });
  }

  /**
   * Force a synchronous redraw, cancelling any pending scheduled one. Used when
   * the canvas pixels must be up-to-date immediately (e.g. before exporting).
   */
  flush(): void {
    if (this.scheduled) {
      cancelAnimationFrame(this.rafId);
      this.scheduled = false;
    }
    this.render();
  }

  /**
   * Cancel any pending scheduled redraw (e.g. when the host is detached).
   */
  cancel(): void {
    if (this.scheduled) {
      cancelAnimationFrame(this.rafId);
      this.scheduled = false;
    }
  }

  /**
   * Build a drawing context (2D context + Rough canvas + coordinates) for the
   * on-screen canvas.
   */
  generateDrawingContext(): DrawingContext {
    const canvas = this.host.getCanvasElement();
    const context = canvas?.getContext("2d");
    if (!canvas || !context) {
      throw new Error("Canvas not found");
    }
    const roughCanvas = rough.canvas(canvas, { options: { seed: 42 } });
    return {
      canvas: context,
      roughCanvas,
      coords: this.host.getCoordsContext(),
    };
  }

  /**
   * The accent color the whiteboard is themed with, so that what is drawn on
   * the canvas follows the same `--sw-accent` token as the surrounding UI.
   */
  private getAccentColor(canvas: HTMLCanvasElement): string {
    const accent = getComputedStyle(canvas)
      .getPropertyValue("--sw-accent")
      .trim();
    return accent || DEFAULT_ACCENT;
  }

  /**
   * Draw the bounding box (and, when resizable, the resize handles) of an item.
   *
   * @param context The 2D context to draw on.
   * @param item The item to outline.
   * @param boxColor Color of the box; defaults to the whiteboard accent color.
   * @param isResizable Whether to draw the item's resize handles.
   */
  drawItemBox(
    context: CanvasRenderingContext2D,
    item: WhiteboardItem<WhiteboardItemType>,
    boxColor?: string,
    isResizable = false
  ): void {
    this.drawBox(context, item, {
      color: boxColor ?? this.getAccentColor(context.canvas),
      halo: true,
      handles: isResizable,
    });
  }

  /**
   * Draw an item's box, either as the (loud) selection or as the (quiet) hover
   * highlight. The box is rounded like the rest of the UI, sits slightly away
   * from the item, and is aligned on half pixels so its thin outline stays
   * crisp.
   */
  private drawBox(
    context: CanvasRenderingContext2D,
    item: WhiteboardItem<WhiteboardItemType>,
    options: {
      color: string;
      alpha?: number;
      halo?: boolean;
      handles?: boolean;
    }
  ): void {
    const boundingRect = item.getBoundingBox();
    if (!boundingRect) {
      return;
    }

    const coords = this.host.getCoordsContext();
    const { x, y, width, height } = boundingRect;
    const { x: coordX, y: coordY } = coords.convertToCanvas(x, y);
    const zoom = coords.getZoom();

    const left = Math.round(coordX - BOX_PADDING) + 0.5;
    const top = Math.round(coordY - BOX_PADDING) + 0.5;
    const right = Math.round(coordX + width * zoom + BOX_PADDING) + 0.5;
    const bottom = Math.round(coordY + height * zoom + BOX_PADDING) + 0.5;

    context.save();
    context.strokeStyle = options.color;
    roundedRectPath(context, left, top, right - left, bottom - top, BOX_RADIUS);
    if (options.halo) {
      context.globalAlpha = BOX_HALO_ALPHA;
      context.lineWidth = BOX_HALO_LINE_WIDTH;
      context.stroke();
    }
    context.globalAlpha = options.alpha ?? 1;
    context.lineWidth = BOX_LINE_WIDTH;
    context.stroke();
    context.restore();

    if (options.handles) {
      this.drawResizeHandles(context, item, options.color);
    }
  }

  /**
   * Draw the resize handles of an item: rounded squares that sit on top of the
   * content with a soft shadow, and that fill up with the accent color when the
   * pointer is over them.
   */
  private drawResizeHandles(
    context: CanvasRenderingContext2D,
    item: WhiteboardItem<WhiteboardItemType>,
    color: string
  ): void {
    const coords = this.host.getCoordsContext();
    const hoveredHandle = this.host.getHoveredResizeHandle();

    context.save();
    item.getResizeHandles().forEach((handle) => {
      const { x: handleX, y: handleY } = coords.convertToCanvas(
        handle.x,
        handle.y
      );
      const isHovered = handle.name === hoveredHandle;
      const size = isHovered
        ? RESIZE_HANDLE_SIZE + HANDLE_HOVER_GROWTH
        : RESIZE_HANDLE_SIZE;
      const left = Math.round(handleX - size / 2) + 0.5;
      const top = Math.round(handleY - size / 2) + 0.5;

      // The path outlives `restore()`, so it is built once and reused: filled
      // with a shadow, then stroked without one.
      roundedRectPath(context, left, top, size, size, HANDLE_RADIUS);

      context.save();
      context.shadowColor = "rgba(15, 23, 42, 0.25)";
      context.shadowBlur = 4;
      context.shadowOffsetY = 1;
      context.fillStyle = isHovered ? color : HANDLE_FILL;
      context.fill();
      context.restore();

      context.strokeStyle = color;
      context.lineWidth = BOX_LINE_WIDTH;
      context.stroke();
    });
    context.restore();
  }

  /**
   * Actually render the canvas: dotted background (if enabled), items (with
   * viewport culling), then the hover/selection boxes and finally the overlays.
   */
  private render(): void {
    const canvas = this.host.getCanvasElement();
    const context = canvas?.getContext("2d");
    if (!canvas || !context) {
      return;
    }

    const { width, height } = canvas;
    context.clearRect(0, 0, width, height);

    const coords = this.host.getCoordsContext();

    // Optional dotted background, drawn behind every item.
    if (this.host.dottedBackground) {
      drawDottedBackground(context, coords.toCamera(), width, height);
    }

    // Draw the items, skipping the ones that are not visible. The selected item
    // is always drawn: it may manage an on-screen editor (e.g. the text tool).
    const drawingContext = this.generateDrawingContext();
    const visibleRect = coords.getVisibleWorldRect(width, height);
    const selectedItemId = this.host.getSelectedItemId();
    this.host.getItems().forEach((item) => {
      if (item.getId() !== selectedItemId) {
        const box = item.getBoundingBox();
        if (box && !rectsIntersect(box, visibleRect)) {
          return;
        }
      }
      item.draw(drawingContext);
    });

    // Draw the hover and selection boxes on top of the items. The hovered item
    // gets a quieter version of the same box, and is skipped when it is also
    // the selected one so the two never stack.
    const accent = this.getAccentColor(canvas);
    const selectedItem = this.host.getSelectedItem();
    const hoveredItem = this.host.getHoveredItem();
    if (hoveredItem && hoveredItem.getId() !== selectedItemId) {
      this.drawBox(context, hoveredItem, { color: accent, alpha: HOVER_ALPHA });
    }
    if (selectedItem) {
      this.drawBox(context, selectedItem, {
        color: accent,
        halo: true,
        handles: selectedItem.isResizable(),
      });
    }

    // Transient overlays (tool cursor, export marquee) on top of everything.
    this.host.drawOverlays(drawingContext, context, width, height);
  }
}
