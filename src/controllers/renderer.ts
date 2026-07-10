import rough from "roughjs";
import { CoordsContext } from "../lib/coords";
import { WhiteboardItem, WhiteboardItemType } from "../lib/item";
import { DrawingContext } from "../lib/types";
import { rectsIntersect } from "../lib/geometry";
import { drawDottedBackground } from "../lib/background";

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
   * Draw the bounding box (and, when resizable, the resize handles) of an item.
   */
  drawItemBox(
    context: CanvasRenderingContext2D,
    item: WhiteboardItem<WhiteboardItemType>,
    boxColor = "#135aa0",
    isResizable = false
  ): void {
    const boundingRect = item.getBoundingBox();
    if (!boundingRect) {
      return;
    }

    const coords = this.host.getCoordsContext();
    const { x, y, width, height } = boundingRect;
    const { x: coordX, y: coordY } = coords.convertToCanvas(x, y);
    const zoom = coords.getZoom();

    context.strokeStyle = boxColor;
    context.lineWidth = 2;
    context.beginPath();
    context.rect(coordX, coordY, width * zoom, height * zoom);
    context.stroke();

    if (!isResizable) {
      return;
    }

    const handleSize = 8;
    const halfHandleSize = handleSize / 2;
    const handleColor = "#135aa0";
    const handleBackgroundColor = "#fff";

    // Draw all resize handles for the item.
    item.getResizeHandles().forEach((handle) => {
      const { x: handleX, y: handleY } = coords.convertToCanvas(
        handle.x,
        handle.y
      );
      context.fillStyle = handleBackgroundColor;
      context.fillRect(
        handleX - halfHandleSize,
        handleY - halfHandleSize,
        handleSize,
        handleSize
      );
      context.strokeStyle = handleColor;
      context.strokeRect(
        handleX - halfHandleSize,
        handleY - halfHandleSize,
        handleSize,
        handleSize
      );
    });
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

    // Draw the hover and selection boxes on top of the items.
    const selectedItem = this.host.getSelectedItem();
    const hoveredItem = this.host.getHoveredItem();
    if (hoveredItem) {
      this.drawItemBox(context, hoveredItem, "#dbe6f0");
    }
    if (selectedItem) {
      this.drawItemBox(context, selectedItem, "#135aa0", selectedItem.isResizable());
    }

    // Transient overlays (tool cursor, export marquee) on top of everything.
    this.host.drawOverlays(drawingContext, context, width, height);
  }
}
