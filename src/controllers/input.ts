import type { ReactiveController } from "lit";
import { distance, midpoint } from "../lib/geometry";
import { Point } from "../lib/types";
import type { SimpleWhiteboard } from "../simple-whiteboard";

/**
 * Handles pointer input for the whiteboard: mouse drawing, middle-click panning,
 * one-finger drawing, two-finger pan + pinch-to-zoom, and wheel pan/zoom.
 *
 * It is a Lit {@link ReactiveController} so it can clean up an in-progress pan
 * (which listens on the window) when the host is detached. The component keeps
 * thin `handleMouse*`/`handleTouch*`/`handleWheel` methods that route the
 * export-area gesture and otherwise delegate here.
 */
export class PointerInputController implements ReactiveController {
  // Middle-click pan state.
  private panning = false;
  private panLast: Point = { x: 0, y: 0 };
  private cursorBeforePan = "default";

  // Two-finger pinch/zoom state.
  private lastDistance = 0;
  private lastOrigin: Point = { x: 0, y: 0 };

  // Bound window listeners for the pan gesture (kept stable so they can be
  // removed again).
  private readonly onPanMove = (e: MouseEvent) => this.panMove(e);
  private readonly onPanEnd = (e: MouseEvent) => this.panEnd(e);

  constructor(private readonly host: SimpleWhiteboard) {
    host.addController(this);
  }

  hostDisconnected(): void {
    // Make sure no pan gesture keeps window listeners alive after detaching.
    this.endPan();
  }

  // --- Mouse -----------------------------------------------------------------

  mouseDown(e: MouseEvent): void {
    // Middle-click pans the canvas, regardless of the currently selected tool.
    if (e.button === 1) {
      e.preventDefault();
      this.startPan(e);
      return;
    }
    this.host.handleDrawingStart(e.offsetX, e.offsetY);
  }

  mouseMove(e: MouseEvent): void {
    // While panning, the gesture is driven by the window listeners.
    if (this.panning) {
      return;
    }

    this.host.requestUpdate();
    this.host.handleDrawingMove(e.offsetX, e.offsetY);

    // Forward the event to the tool (used e.g. for hover highlighting).
    const tool = this.host.getToolInstance(this.host.getCurrentTool());
    tool?.handleMouseMove(e);
  }

  mouseUp(): void {
    if (this.panning) {
      return;
    }
    this.host.handleDrawingEnd();
  }

  // --- Middle-click pan ------------------------------------------------------

  /**
   * Start a middle-click pan gesture. The move/end of the gesture is tracked on
   * the window so it keeps working (and ends reliably) even if the pointer
   * leaves the canvas.
   */
  private startPan(e: MouseEvent): void {
    this.panning = true;
    this.panLast = { x: e.clientX, y: e.clientY };
    this.cursorBeforePan = this.host.getCursor();
    this.host.setCursor("grabbing");

    window.addEventListener("mousemove", this.onPanMove);
    window.addEventListener("mouseup", this.onPanEnd);
  }

  /**
   * Translate the canvas by however much the pointer moved during a pan.
   */
  private panMove(e: MouseEvent): void {
    if (!this.panning) {
      return;
    }

    // Safety net: if the middle button is no longer pressed, stop panning.
    if ((e.buttons & 4) === 0) {
      this.endPan();
      return;
    }

    const dx = e.clientX - this.panLast.x;
    const dy = e.clientY - this.panLast.y;
    this.panLast = { x: e.clientX, y: e.clientY };

    const coords = this.host.getCoordsContext();
    const { x, y } = coords.getCoords();
    coords.setCoords(x + dx, y + dy);
    this.host.draw();
  }

  /**
   * End the pan when the middle button is released.
   */
  private panEnd(e: MouseEvent): void {
    if (e.button === 1) {
      this.endPan();
    }
  }

  /**
   * Stop the pan gesture and restore the previous cursor.
   */
  private endPan(): void {
    if (!this.panning) {
      return;
    }
    this.panning = false;
    window.removeEventListener("mousemove", this.onPanMove);
    window.removeEventListener("mouseup", this.onPanEnd);
    this.host.setCursor(this.cursorBeforePan);
  }

  // --- Touch -----------------------------------------------------------------

  touchStart(e: TouchEvent): void {
    const canvas = this.host.getCanvasElement();
    if (e.touches.length < 1 || !canvas) {
      return;
    }

    // Prevent the default action to prevent scrolling.
    e.preventDefault();

    const rect = canvas.getBoundingClientRect();

    // Remember the pinch center and finger spacing for a two-finger gesture.
    if (e.touches.length === 2) {
      const touchA = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      const touchB = { x: e.touches[1].clientX, y: e.touches[1].clientY };
      const center = midpoint(touchA, touchB);
      this.lastOrigin = { x: center.x - rect.left, y: center.y - rect.top };
      this.lastDistance = distance(touchA, touchB);
    }

    const touch = e.touches[0];
    this.host.handleDrawingStart(
      touch.clientX - rect.left,
      touch.clientY - rect.top
    );
  }

  touchMove(e: TouchEvent): void {
    const canvas = this.host.getCanvasElement();
    if (e.touches.length < 1 || !canvas) {
      return;
    }

    // Prevent the default action to prevent scrolling.
    e.preventDefault();

    const rect = canvas.getBoundingClientRect();

    // Two fingers: pan by the pinch-center movement and zoom by the spread.
    if (e.touches.length === 2) {
      const touchA = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      const touchB = { x: e.touches[1].clientX, y: e.touches[1].clientY };

      const center = midpoint(touchA, touchB);
      const origin = { x: center.x - rect.left, y: center.y - rect.top };

      const dx = origin.x - this.lastOrigin.x;
      const dy = origin.y - this.lastOrigin.y;
      this.lastOrigin = origin;

      const coords = this.host.getCoordsContext();
      const { x, y } = coords.getCoords();
      coords.setCoords(x + dx, y + dy);

      // Zoom anchored on the pinch center so the content scales around fingers.
      const touchDistance = distance(touchA, touchB);
      const zoomFactor = touchDistance / this.lastDistance;
      this.lastDistance = touchDistance;

      this.host.setZoomAtPoint(coords.getZoom() * zoomFactor, origin.x, origin.y);
      return;
    }

    const touch = e.touches[0];
    this.host.handleDrawingMove(
      touch.clientX - rect.left,
      touch.clientY - rect.top
    );
  }

  touchEnd(): void {
    this.host.handleDrawingEnd();
  }

  touchCancel(): void {
    this.host.draw();
  }

  // --- Wheel -----------------------------------------------------------------

  wheel(e: WheelEvent): void {
    e.preventDefault();

    const isTrackpad = Math.abs(e.deltaY) < 50; // Detect trackpad VS mouse wheel.
    const scaleFactor = isTrackpad ? 0.02 : 0.1; // Slower on trackpads.

    const coords = this.host.getCoordsContext();

    // Ctrl/Cmd + wheel zooms, anchored on the cursor position.
    if (e.ctrlKey || e.metaKey) {
      const zoomFactor = e.deltaY > 0 ? 1 - scaleFactor : 1 + scaleFactor;
      this.host.setZoomAtPoint(coords.getZoom() * zoomFactor, e.offsetX, e.offsetY);
      return;
    }

    // Otherwise, pan the canvas.
    const { x, y } = coords.getCoords();
    coords.setCoords(x - e.deltaX, y - e.deltaY);
    this.host.draw();
    this.host.requestUpdate();
  }
}
