import {
  LitElement,
  PropertyDeclaration,
  PropertyValues,
  TemplateResult,
  html,
} from "lit";
import rough from "roughjs";
import { customElement, property, state } from "lit/decorators.js";
import { unsafeHTML } from "lit/directives/unsafe-html.js";
import { I18nContext } from "./lib/locales";
import { WhiteboardTool } from "./lib/tool";
import {
  ExportedWhiteboardItem,
  WhiteboardItem,
  WhiteboardItemType,
} from "./lib/item";
import { DrawingContext, Point, BoundingRect } from "./lib/types";
import { CoordsContext } from "./lib/coords";
import { clamp, distance, midpoint, rectsIntersect } from "./lib/geometry";
import { drawDottedBackground } from "./lib/background";
import { downloadCanvasAsPng, CanvasPngExportOptions } from "./lib/canvasExport";
import { ToolbarTooltip } from "./lib/toolbarTooltip";
import { HistoryStack } from "./lib/history";
import { getIconSvg } from "./lib/icons";
import { styles } from "./styles";

import "./components/menu";

@customElement("simple-whiteboard")
export class SimpleWhiteboard extends LitElement {
  @property({ type: Boolean })
  debug = false;

  @property({ type: Boolean })
  hideLocalePicker = false;

  @property()
  locale: string = "en";

  /**
   * Whether to render a dotted grid behind the content.
   *
   * Enabled by default. It can be disabled declaratively with
   * `dotted-background="false"`, or programmatically by setting the
   * `dottedBackground` property to `false`.
   */
  @property({
    attribute: "dotted-background",
    converter: {
      // A missing attribute keeps the default (enabled). Any present value
      // other than "false" enables it, so `dotted-background` on its own still
      // works; only `dotted-background="false"` disables it.
      fromAttribute: (value: string | null) => value !== "false",
      toAttribute: (value: boolean) => (value ? "" : "false"),
    },
  })
  dottedBackground = true;

  /**
   * Whether to hide the floating tool-options panel.
   *
   * The panel is drawn over the top-left of the canvas, which is fine for a
   * full-size board but gets in the way of a small, embedded one. Set
   * `hide-tool-options` to hide it; the tools themselves keep working (you just
   * lose the per-tool controls such as color and size).
   */
  @property({ type: Boolean, attribute: "hide-tool-options" })
  hideToolOptions = false;

  @state()
  isReady: boolean = false;

  @state()
  private cursor: string = "default";

  private i18nContext: I18nContext = new I18nContext();
  private coordsContext: CoordsContext = new CoordsContext();

  private mouseCoords: Point = { x: 0, y: 0 };

  private canvas?: HTMLCanvasElement;
  private canvasContext?: CanvasRenderingContext2D;

  // State for the two-finger pinch/zoom gesture.
  private lastDistance = 0;
  private lastOrigin: Point = { x: 0, y: 0 };

  // State for the middle-click "pan the canvas" gesture. It works with any tool
  // selected. While panning, we listen on the window so the gesture keeps going
  // (and ends reliably) even when the pointer leaves the canvas.
  private isPanning = false;
  private panLast: Point = { x: 0, y: 0 };
  private cursorBeforePan = "default";

  // State for the "export a selected area" gesture. When active, a pointer drag
  // draws a marquee (in canvas pixels) instead of drawing/panning, and releasing
  // exports that region. See `startAreaExport`.
  private isSelectingExportArea = false;
  private exportAreaStart: Point | null = null;
  private exportAreaCurrent: Point | null = null;
  private exportAreaOptions: CanvasPngExportOptions = {};

  // Undo/redo history. Each entry is a JSON snapshot of the exported items.
  private history = new HistoryStack<string>({ limit: 50 });
  // `true` while a snapshot is being restored, to avoid recording that as a
  // new history entry.
  private isRestoringHistory = false;
  // `true` between a drawing start and end (a pointer interaction). Item changes
  // during an interaction are committed once, at the end, as a single step.
  private isInteracting = false;

  // Manages the little tooltip shown under the toolbar buttons.
  private toolbarTooltip = new ToolbarTooltip(() => this.shadowRoot);

  // Used to coalesce redraws: multiple `draw()` calls within the same frame are
  // batched into a single render (CPU optimization).
  private drawScheduled = false;
  private rafId = 0;

  // Bound event handlers, kept as stable references so they can actually be
  // removed again on disconnect.
  private readonly onKeyDown = (e: KeyboardEvent) => this.handleKeyDown(e);
  private readonly onResize = () => this.handleResize();
  private readonly onVisibilityChange = () => this.handleVisibilityChange();
  private readonly onPanMove = (e: MouseEvent) => this.handlePanMove(e);
  private readonly onPanEnd = (e: MouseEvent) => this.handlePanEnd(e);

  @state() private registeredTools: Map<
    string,
    WhiteboardTool<WhiteboardItem<WhiteboardItemType>>
  > = new Map();

  @state() private items: WhiteboardItem<WhiteboardItemType>[] = [];

  @state() private currentTool: string = "";
  @state() private previousTool: string = "";

  @state() private selectedItemId: string | null = null;
  @state() private hoveredItemId: string | null = null;

  static styles = styles;

  protected firstUpdated(): void {
    this.canvas = this.shadowRoot?.querySelector("canvas") || undefined;
    if (!this.canvas) {
      throw new Error("Canvas not found");
    }

    const canvasContext = this.canvas.getContext("2d");
    if (!canvasContext) {
      throw new Error("Canvas context not found");
    }
    this.canvasContext = canvasContext;
    this.handleResize();

    // Establish the initial history baseline (usually an empty board).
    this.resetHistory();

    // Just send a ready event ; the whiteboard element is available
    const readyEvent = new CustomEvent("ready", {
      detail: {
        status: "ready",
      },
    });
    this.dispatchEvent(readyEvent);
  }

  protected updated(changedProperties: PropertyValues): void {
    // The dotted background is drawn on the canvas, not via the Lit template, so
    // we need to trigger a redraw ourselves when the property changes.
    if (changedProperties.has("dottedBackground")) {
      this.draw();
    }
  }

  handleResize() {
    if (!this.canvas) {
      return;
    }

    this.canvas.width = this.canvas.clientWidth;
    this.canvas.height = this.canvas.clientHeight;

    this.coordsContext.setOffset(this.canvas.width / 2, this.canvas.height / 2);

    this.draw();
  }

  handleVisibilityChange() {
    if (!this.canvas) {
      return;
    }

    this.draw();
  }

  getBoundingRect(
    item: WhiteboardItem<WhiteboardItemType>
  ): { x: number; y: number; width: number; height: number } | null {
    return item.getBoundingBox();
  }

  drawItemBox(
    context: CanvasRenderingContext2D,
    item: WhiteboardItem<WhiteboardItemType>,
    boxColor = "#135aa0",
    isResizable = false
  ): void {
    const boundingRect = this.getBoundingRect(item);
    if (!boundingRect) {
      return;
    }

    const { x, y, width, height } = boundingRect;
    const { x: coordX, y: coordY } = this.coordsContext.convertToCanvas(x, y);
    const zoom = this.coordsContext.getZoom();

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

    // Draw all resize handles for the item
    item.getResizeHandles().forEach((handle) => {
      const { x: handleX, y: handleY } = this.coordsContext.convertToCanvas(
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

  generateDrawingContext(): DrawingContext {
    if (!this.canvas || !this.canvasContext) {
      throw new Error("Canvas not found");
    }

    const rc = rough.canvas(this.canvas, { options: { seed: 42 } });
    return {
      canvas: this.canvasContext,
      roughCanvas: rc,
      coords: this.coordsContext,
    };
  }

  /**
   * Request a redraw of the canvas.
   *
   * Redraws are coalesced using `requestAnimationFrame`: calling this many
   * times within the same frame results in a single render. This keeps CPU
   * usage low during intensive interactions such as drawing or panning.
   */
  public draw(): void {
    if (this.drawScheduled) {
      return;
    }
    this.drawScheduled = true;
    this.rafId = requestAnimationFrame(() => {
      this.drawScheduled = false;
      this.renderCanvas();
    });
  }

  /**
   * Force a synchronous redraw, cancelling any pending scheduled one.
   * Used when the canvas pixels need to be up-to-date immediately (e.g. before
   * exporting the canvas as an image).
   */
  private flushDraw(): void {
    if (this.drawScheduled) {
      cancelAnimationFrame(this.rafId);
      this.drawScheduled = false;
    }
    this.renderCanvas();
  }

  /**
   * Actually render the canvas: dotted background (if enabled), items, then the
   * hover/selection boxes.
   *
   * Items whose bounding box lies entirely outside the viewport are skipped
   * (viewport culling), so only what is visible is ever drawn.
   */
  private renderCanvas(): void {
    if (!this.canvas || !this.canvasContext) {
      return;
    }

    const context = this.canvasContext;
    const { width, height } = this.canvas;
    context.clearRect(0, 0, width, height);

    // Optional dotted background, drawn behind every item.
    if (this.dottedBackground) {
      drawDottedBackground(
        context,
        this.coordsContext.toCamera(),
        width,
        height
      );
    }

    // Draw the items, skipping the ones that are not visible. The selected item
    // is always drawn: it may manage an on-screen editor (e.g. the text tool).
    const drawingContext = this.generateDrawingContext();
    const visibleRect = this.coordsContext.getVisibleWorldRect(width, height);
    this.items.forEach((item) => {
      if (item.getId() !== this.selectedItemId) {
        const box = item.getBoundingBox();
        if (box && !rectsIntersect(box, visibleRect)) {
          return;
        }
      }
      item.draw(drawingContext);
    });

    // Draw the hover and selection boxes on top of the items.
    const selectedItem = this.getSelectedItem();
    const hoveredItem = this.getHoveredItem();
    if (hoveredItem) {
      this.drawItemBox(context, hoveredItem, "#dbe6f0");
    }
    if (selectedItem) {
      const isResizable = selectedItem.isResizable();
      this.drawItemBox(context, selectedItem, "#135aa0", isResizable);
    }

    // Let the active tool draw a transient overlay on top (e.g. the eraser
    // cursor). This is never part of the items and is not exported.
    const activeTool = this.registeredTools.get(this.currentTool);
    activeTool?.drawOverlay(drawingContext);

    // While picking an area to export, draw the marquee on top of everything.
    this.drawExportAreaMarquee(context, width, height);
  }

  /**
   * Draw the "export a selected area" marquee: everything outside the picked
   * rectangle is dimmed, and the rectangle itself gets a dashed accent border.
   */
  private drawExportAreaMarquee(
    context: CanvasRenderingContext2D,
    width: number,
    height: number
  ): void {
    if (!this.isSelectingExportArea) {
      return;
    }
    const start = this.exportAreaStart;
    const current = this.exportAreaCurrent;

    context.save();

    // Before the first drag, dim the whole canvas as a hint that a region is
    // expected.
    if (!start || !current) {
      context.fillStyle = "rgba(15, 23, 42, 0.18)";
      context.fillRect(0, 0, width, height);
      context.restore();
      return;
    }

    const rx = Math.min(start.x, current.x);
    const ry = Math.min(start.y, current.y);
    const rw = Math.abs(current.x - start.x);
    const rh = Math.abs(current.y - start.y);

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

  /**
   * Whether the event originates from a text input, so we can let the browser
   * handle shortcuts (like undo) natively instead of hijacking them.
   */
  private isEditableTarget(e: Event): boolean {
    const path = (e.composedPath && e.composedPath()) || [];
    const el = (path[0] as HTMLElement) || (e.target as HTMLElement);
    if (!el || !el.tagName) {
      return false;
    }
    const tag = el.tagName;
    return tag === "TEXTAREA" || tag === "INPUT" || el.isContentEditable;
  }

  handleKeyDown(e: KeyboardEvent) {
    const isModifier = e.metaKey || e.ctrlKey;
    const key = e.key.toLowerCase();

    // Escape cancels an in-progress "export selected area" gesture.
    if (e.key === "Escape" && this.isSelectingExportArea) {
      e.preventDefault();
      this.cancelAreaExport();
      return;
    }

    // Undo / redo shortcuts (Cmd/Ctrl+Z, Cmd/Ctrl+Shift+Z, Ctrl+Y).
    // Skipped while typing in a text field so the field's own undo keeps working.
    if (isModifier && (key === "z" || key === "y")) {
      if (this.isEditableTarget(e)) {
        return;
      }
      e.preventDefault();
      if (key === "y" || e.shiftKey) {
        this.redo();
      } else {
        this.undo();
      }
      return;
    }

    // If it is the backspace key, we remove the selected item
    if (e.key === "Backspace") {
      const selectedItem = this.getSelectedItem();
      if (selectedItem && selectedItem.isRemovableWithBackspace()) {
        this.removeItemById(selectedItem.getId(), true);
      }
    }
  }

  connectedCallback(): void {
    this.isReady = true;
    const i18n = this.i18nContext.getInstance();
    i18n.on("languageChanged", (lang: string) => {
      this.locale = lang;
      if (this.debug) {
        console.log("Language changed event", lang);
      }
      this.requestUpdate();
    });
    window.addEventListener("keydown", this.onKeyDown);
    window.addEventListener("resize", this.onResize);
    document.addEventListener("visibilitychange", this.onVisibilityChange);
    super.connectedCallback();
  }

  disconnectedCallback(): void {
    this.isReady = false;
    const i18n = this.i18nContext.getInstance();
    i18n.off("languageChanged");
    document.removeEventListener("visibilitychange", this.onVisibilityChange);
    window.removeEventListener("resize", this.onResize);
    window.removeEventListener("keydown", this.onKeyDown);

    // Make sure no pan gesture keeps window listeners alive after detaching.
    this.endPan();

    // Cancel any pending redraw so we do not run after being detached.
    if (this.drawScheduled) {
      cancelAnimationFrame(this.rafId);
      this.drawScheduled = false;
    }
    super.disconnectedCallback();
  }

  handleDrawingStart(x: number, y: number) {
    const tool = this.registeredTools.get(this.currentTool);
    if (!tool) {
      return;
    }
    // Flush any pending change (e.g. text being typed) as its own history step
    // before starting a new interaction.
    this.commitHistory();
    this.isInteracting = true;
    tool.handleDrawingStart(x, y);
    this.draw();
  }

  handleDrawingMove(x: number, y: number) {
    const { x: mouseX, y: mouseY } = this.coordsContext.convertFromCanvas(x, y);
    this.mouseCoords = { x: mouseX, y: mouseY };
    const tool = this.registeredTools.get(this.currentTool);
    if (!tool) {
      return;
    }
    tool.handleDrawingMove(x, y);
    this.draw();
  }

  handleDrawingEnd() {
    const tool = this.registeredTools.get(this.currentTool);
    if (!tool) {
      this.isInteracting = false;
      return;
    }
    tool.handleDrawingEnd();
    this.isInteracting = false;
    this.draw();
    // Record the whole interaction (draw / drag / resize) as a single step.
    this.commitHistory();
  }

  handleMouseDown(e: MouseEvent) {
    // While picking an area to export, a left-drag draws the marquee and
    // nothing else happens (no drawing, no panning).
    if (this.isSelectingExportArea) {
      if (e.button === 0) {
        this.exportAreaStart = { x: e.offsetX, y: e.offsetY };
        this.exportAreaCurrent = { x: e.offsetX, y: e.offsetY };
        this.draw();
      }
      return;
    }

    // Middle-click pans the canvas, regardless of the currently selected tool.
    if (e.button === 1) {
      e.preventDefault();
      this.startPan(e);
      return;
    }
    this.handleDrawingStart(e.offsetX, e.offsetY);
  }

  handleMouseMove(e: MouseEvent) {
    // Update the export-area marquee while dragging it.
    if (this.isSelectingExportArea) {
      if (this.exportAreaStart) {
        this.exportAreaCurrent = { x: e.offsetX, y: e.offsetY };
        this.draw();
      }
      return;
    }

    // While panning, the gesture is driven by the window listeners.
    if (this.isPanning) {
      return;
    }

    this.requestUpdate();
    this.handleDrawingMove(e.offsetX, e.offsetY);

    // Forward the event to the tool
    const tool = this.registeredTools.get(this.currentTool);
    if (!tool) {
      return;
    }
    tool.handleMouseMove(e);
  }

  handleMouseUp() {
    // Releasing the mouse finishes the export-area selection.
    if (this.isSelectingExportArea) {
      this.finishAreaExport();
      return;
    }
    if (this.isPanning) {
      return;
    }
    this.handleDrawingEnd();
  }

  /**
   * Start a middle-click pan gesture. The move/end of the gesture is tracked on
   * the window so it keeps working (and ends reliably) even if the pointer
   * leaves the canvas.
   *
   * @param e The triggering `mousedown` event.
   */
  private startPan(e: MouseEvent): void {
    this.isPanning = true;
    this.panLast = { x: e.clientX, y: e.clientY };
    this.cursorBeforePan = this.cursor;
    this.setCursor("grabbing");

    window.addEventListener("mousemove", this.onPanMove);
    window.addEventListener("mouseup", this.onPanEnd);
  }

  /**
   * Handle a pointer move during a middle-click pan: translate the canvas by
   * however much the pointer moved.
   *
   * @param e The `mousemove` event.
   */
  private handlePanMove(e: MouseEvent): void {
    if (!this.isPanning) {
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

    const { x, y } = this.coordsContext.getCoords();
    this.coordsContext.setCoords(x + dx, y + dy);
    this.draw();
  }

  /**
   * End the middle-click pan gesture when the middle button is released.
   *
   * @param e The `mouseup` event.
   */
  private handlePanEnd(e: MouseEvent): void {
    if (e.button === 1) {
      this.endPan();
    }
  }

  /**
   * Stop the middle-click pan gesture and restore the previous cursor.
   */
  private endPan(): void {
    if (!this.isPanning) {
      return;
    }
    this.isPanning = false;
    window.removeEventListener("mousemove", this.onPanMove);
    window.removeEventListener("mouseup", this.onPanEnd);
    this.setCursor(this.cursorBeforePan);
  }

  handleTouchStart(e: TouchEvent) {
    if (e.touches.length < 1 || !this.canvas) {
      return;
    }

    // Prevent the default action to prevent scrolling
    e.preventDefault();

    // Position of the touches relative to the canvas.
    const rect = this.canvas.getBoundingClientRect();

    // While picking an export area, a one-finger drag draws the marquee.
    if (this.isSelectingExportArea) {
      const t = e.touches[0];
      this.exportAreaStart = { x: t.clientX - rect.left, y: t.clientY - rect.top };
      this.exportAreaCurrent = { ...this.exportAreaStart };
      this.draw();
      return;
    }

    // Handle zooming
    if (e.touches.length === 2) {
      const touchA = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      const touchB = { x: e.touches[1].clientX, y: e.touches[1].clientY };

      // Remember the pinch center (relative to the canvas) and the spacing
      // between the fingers, both used to drive the gesture in touchmove.
      const center = midpoint(touchA, touchB);
      this.lastOrigin = { x: center.x - rect.left, y: center.y - rect.top };
      this.lastDistance = distance(touchA, touchB);
    }

    // Get the first touch
    const touch = e.touches[0];
    const x = touch.clientX - rect.left;
    const y = touch.clientY - rect.top;

    this.handleDrawingStart(x, y);
  }

  handleTouchMove(e: TouchEvent) {
    if (e.touches.length < 1 || !this.canvas) {
      return;
    }

    // Prevent the default action to prevent scrolling
    e.preventDefault();

    // Position of the touches relative to the canvas.
    const rect = this.canvas.getBoundingClientRect();

    // Update the export-area marquee while dragging it with one finger.
    if (this.isSelectingExportArea) {
      if (this.exportAreaStart) {
        const t = e.touches[0];
        this.exportAreaCurrent = {
          x: t.clientX - rect.left,
          y: t.clientY - rect.top,
        };
        this.draw();
      }
      return;
    }

    // Handle panning + pinch-to-zoom
    if (e.touches.length === 2) {
      const touchA = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      const touchB = { x: e.touches[1].clientX, y: e.touches[1].clientY };

      // Current pinch center, relative to the canvas.
      const center = midpoint(touchA, touchB);
      const origin = { x: center.x - rect.left, y: center.y - rect.top };

      // Pan by how much the pinch center moved (two-finger drag).
      const dx = origin.x - this.lastOrigin.x;
      const dy = origin.y - this.lastOrigin.y;
      this.lastOrigin = origin;

      const { x, y } = this.coordsContext.getCoords();
      this.coordsContext.setCoords(x + dx, y + dy);

      // Zoom by how much the fingers spread, anchored on the pinch center so
      // the content scales around the fingers.
      const touchDistance = distance(touchA, touchB);
      const zoomFactor = touchDistance / this.lastDistance;
      this.lastDistance = touchDistance;

      const zoom = this.coordsContext.getZoom() * zoomFactor;
      this.setZoomAtPoint(zoom, origin.x, origin.y);
      return;
    }

    // Get the first touch
    const touch = e.touches[0];
    const x = touch.clientX - rect.left;
    const y = touch.clientY - rect.top;

    this.handleDrawingMove(x, y);
  }

  handleWheel(e: WheelEvent) {
    e.preventDefault();

    const isTrackpad = Math.abs(e.deltaY) < 50; // Detect trackpad VS mouse wheel
    const scaleFactor = isTrackpad ? 0.02 : 0.1; // Lower for trackpads to slow down zoom

    // Handle zooming
    if (e.ctrlKey || e.metaKey) {
      // Zoom in or out, anchored on the cursor position.
      const zoomFactor = e.deltaY > 0 ? 1 - scaleFactor : 1 + scaleFactor;
      const zoom = this.coordsContext.getZoom() * zoomFactor;
      this.setZoomAtPoint(zoom, e.offsetX, e.offsetY);
      return;
    }

    // Move the canvas
    const { x, y } = this.coordsContext.getCoords();
    this.coordsContext.setCoords(x - e.deltaX, y - e.deltaY);
    this.draw();
    this.requestUpdate();
  }

  handleTouchEnd() {
    if (this.isSelectingExportArea) {
      this.finishAreaExport();
      return;
    }
    this.handleDrawingEnd();
  }

  handleTouchCancel() {
    this.draw();
  }

  /**
   * Handle the change of the tool.
   *
   * @param tool The name of the tool that was selected.
   * @param event Event that triggered the change of the tool and that needs to stop the propagation.
   */
  private handleToolChange(tool: string, event: Event): void {
    event.stopPropagation();
    this.setCurrentTool(tool);
  }

  /**
   * Register a tool.
   *
   * @param tool The tool to register.
   */
  public registerTool(
    tool: WhiteboardTool<WhiteboardItem<WhiteboardItemType>>
  ): void {
    if (!tool || !tool.getName) {
      throw new Error("Invalid tool");
    }

    const toolName = tool.getName();
    this.registeredTools.set(toolName, tool);
    this.draw();
    this.requestUpdate();

    // Just send an event saying that a tool was registered
    const toolRegistered = new CustomEvent("tool-registered", {
      detail: {
        name: toolName,
      },
    });
    this.dispatchEvent(toolRegistered);
  }

  requestUpdate(
    name?: PropertyKey | undefined,
    oldValue?: unknown,
    options?: PropertyDeclaration<unknown, unknown> | undefined
  ): void {
    if (this.debug) {
      console.log("Request update", name, oldValue, options);
    }

    // Make sure to update the locale in the i18n context if the 'locale' property changes
    if (name === "locale" && this.i18nContext && this.locale !== oldValue) {
      this.i18nContext.setLocale(this.locale);
    }

    super.requestUpdate(name, oldValue, options);
  }

  resetWhiteboard() {
    this.items.forEach((item) => item.onRemove());
    this.items = [];
    this.selectedItemId = null;
  }

  public clearWhiteboard() {
    this.resetWhiteboard();
    this.coordsContext.reset();
    this.draw();

    const itemsUpdatedEvent = new CustomEvent("items-updated", {
      detail: {
        type: "clear",
      },
    });
    this.dispatchEvent(itemsUpdatedEvent);

    // Clearing is an undoable action.
    this.commitHistory();
  }

  renderToolsOptions(): TemplateResult | null {
    // The whole options panel can be hidden (e.g. for a compact embedded board
    // where it would otherwise cover the canvas).
    if (this.hideToolOptions) {
      return null;
    }

    const selectedItem = this.getSelectedItem();
    const currentTool = this.registeredTools.get(this.currentTool);
    const selectedItemTool = selectedItem
      ? this.registeredTools.get(selectedItem.getType())
      : null;
    const tool = selectedItemTool || currentTool;

    const options = tool ? tool.renderToolOptions(selectedItem) : null;
    // Stacking-order controls are shared by every item type, so they are
    // rendered here rather than in each tool.
    const layerControls = selectedItem
      ? this.renderLayerControls(selectedItem)
      : null;

    if (!options && !layerControls) {
      return null;
    }
    return html`<div class="tools-options">${options}${layerControls}</div>`;
  }

  /**
   * Render the stacking-order ("Arrange") controls for the selected item.
   *
   * @param item The currently selected item.
   */
  private renderLayerControls(
    item: WhiteboardItem<WhiteboardItemType>
  ): TemplateResult {
    const i18n = this.i18nContext;
    const id = item.getId();
    const index = this.getItemIndexById(id) ?? 0;
    const isAtBack = index <= 0;
    const isAtFront = index >= this.items.length - 1;

    const button = (
      icon: string,
      labelKey: string,
      action: () => void,
      disabled: boolean
    ) => html`<button
      class="layer-button"
      title=${i18n.t(labelKey)}
      aria-label=${i18n.t(labelKey)}
      ?disabled=${disabled}
      @click=${action}
    >
      ${unsafeHTML(getIconSvg(icon))}
    </button>`;

    return html`
      <p>${i18n.t("tool-options-arrange")}</p>
      <div class="layer-tools">
        ${button(
          "ArrowDownToLine",
          "tool-options-send-to-back",
          () => this.sendItemToBack(id, true),
          isAtBack
        )}
        ${button(
          "ArrowDown",
          "tool-options-send-backward",
          () => this.moveItemBackward(id, true),
          isAtBack
        )}
        ${button(
          "ArrowUp",
          "tool-options-bring-forward",
          () => this.moveItemForward(id, true),
          isAtFront
        )}
        ${button(
          "ArrowUpToLine",
          "tool-options-bring-to-front",
          () => this.bringItemToFront(id, true),
          isAtFront
        )}
      </div>
    `;
  }

  /**
   * Resolve the tooltip label for a tool, falling back to a capitalized version
   * of the tool name when no translation is available.
   *
   * @param toolName The internal name of the tool.
   * @returns The label to show in the tooltip.
   */
  private getToolTooltip(toolName: string): string {
    const key = `tool-tooltip-${toolName}`;
    const label = this.i18nContext.t(key);
    if (!label || label === key) {
      return toolName.charAt(0).toLocaleUpperCase() + toolName.slice(1);
    }
    return label;
  }

  renderToolsList() {
    const tools = [];

    for (const [toolName, tool] of this.registeredTools) {
      const icon = tool.getIcon();
      if (!icon) {
        continue;
      }

      const button = html`<button
        class=${this.currentTool === toolName ? "tools--active" : ""}
        @mouseover=${(e: MouseEvent) =>
          this.toolbarTooltip.show(e.target, this.getToolTooltip(toolName))}
        @mouseout=${() => this.toolbarTooltip.hide()}
        @click=${(e: Event) => this.handleToolChange(toolName, e)}
      >
        ${icon}
      </button>`;

      tools.push(button);
    }

    if (tools.length === 0) {
      return null;
    }

    return html`<div class="tools">${tools}</div>`;
  }

  /**
   * Set the zoom level, anchored on the center of the canvas.
   * Used for programmatic zoom changes such as the zoom dropdown.
   *
   * @param zoom The new zoom level (clamped between 25% and 400%).
   */
  setZoom(zoom: number) {
    if (this.canvas) {
      this.setZoomAtPoint(zoom, this.canvas.width / 2, this.canvas.height / 2);
    } else {
      this.coordsContext.setZoom(clamp(zoom, 0.25, 4));
      this.draw();
    }
  }

  /**
   * Set the zoom level while keeping a given screen point anchored, so the
   * content zooms around that point (the cursor or the pinch center) rather
   * than around the canvas origin.
   *
   * @param zoom The new zoom level (clamped between 25% and 400%).
   * @param screenX The x-coordinate to anchor, in canvas pixels.
   * @param screenY The y-coordinate to anchor, in canvas pixels.
   */
  setZoomAtPoint(zoom: number, screenX: number, screenY: number) {
    this.coordsContext.zoomToScreenPoint(
      clamp(zoom, 0.25, 4),
      screenX,
      screenY
    );
    this.draw();
    // Keep the footer zoom indicator in sync with wheel/pinch zooming.
    this.requestUpdate();
  }

  renderZoomSelect() {
    const options = [
      { value: 0.25, label: "25%" },
      { value: 0.5, label: "50%" },
      { value: 0.75, label: "75%" },
      { value: 1, label: "100%" },
      { value: 1.5, label: "150%" },
      { value: 2, label: "200%" },
      { value: 4, label: "400%" },
    ];
    const zoom = this.coordsContext.getZoom();
    const closestValue = options.reduce((prev, curr) =>
      Math.abs(curr.value - zoom) < Math.abs(prev.value - zoom) ? curr : prev
    ).value;

    const select = html`<select
      @change=${(e: Event) => {
        const target = e.target as HTMLSelectElement;
        this.setZoom(parseFloat(target.value));
      }}
    >
      ${options.map(
        (option) => html`<option
          value=${option.value}
          ?selected=${option.value === closestValue}
        >
          ${option.label}
        </option>`
      )}
    </select>`;
    return select;
  }

  renderDebug() {
    if (!this.debug) {
      return null;
    }

    return html`<pre>
${Math.round(this.mouseCoords.x * 100) / 100}x${Math.round(
        this.mouseCoords.y * 100
      ) / 100}</pre
    >`;
  }

  renderHistoryControls() {
    const i18n = this.i18nContext;
    return html`<div class="history-tools">
      <button
        class="history-button"
        ?disabled=${!this.canUndo()}
        title=${i18n.t("history-undo")}
        aria-label=${i18n.t("history-undo")}
        @click=${() => this.undo()}
      >
        ${unsafeHTML(getIconSvg("Undo2"))}
      </button>
      <button
        class="history-button"
        ?disabled=${!this.canRedo()}
        title=${i18n.t("history-redo")}
        aria-label=${i18n.t("history-redo")}
        @click=${() => this.redo()}
      >
        ${unsafeHTML(getIconSvg("Redo2"))}
      </button>
    </div>`;
  }

  renderFooterTools() {
    return html`<div class="footer-tools">
      ${this.renderHistoryControls()} ${this.renderZoomSelect()}
      ${this.renderDebug()}
    </div>`;
  }

  renderMenu() {
    return html`<simple-whiteboard-menu
      class="menu"
      .instance=${this}
    ></simple-whiteboard-menu>`;
  }

  render() {
    if (!this.isReady) {
      return null;
    }

    return html`
      <div class="root" style="cursor: ${this.cursor}">
        ${this.renderMenu()}

        <slot name="tools"></slot>
        <div id="tools-tooltip"></div>

        ${this.renderToolsList()} ${this.renderToolsOptions()}
        ${this.renderFooterTools()}

        <canvas
          @mousedown="${this.handleMouseDown}"
          @mouseup="${this.handleMouseUp}"
          @mousemove="${this.handleMouseMove}"
          @wheel="${this.handleWheel}"
          @touchstart="${this.handleTouchStart}"
          @touchmove="${this.handleTouchMove}"
          @touchend="${this.handleTouchEnd}"
          @touchcancel="${this.handleTouchCancel}"
        ></canvas>
      </div>
    `;
  }

  public getDefaultToolName(): string {
    return "pointer";
  }

  public getItems(): WhiteboardItem<WhiteboardItemType>[] {
    return this.items;
  }

  public getCoordsContext(): CoordsContext {
    return this.coordsContext;
  }

  public getI18nContext(): I18nContext {
    return this.i18nContext;
  }

  public exportItems(): ExportedWhiteboardItem<WhiteboardItemType>[] {
    return this.items.map((item) => item.export());
  }

  public importItem(
    item: ExportedWhiteboardItem<WhiteboardItemType>,
    shouldThrow = false
  ): WhiteboardItem<WhiteboardItemType> | null {
    const tool = this.registeredTools.get(item.type);
    if (!tool) {
      if (shouldThrow) {
        throw new Error(`Tool not found: ${item.type}`);
      } else {
        console.error(`Tool not found: ${item.type} ; skipping item`);
        return null;
      }
    }
    const newItem = tool.import(item);
    if (newItem) {
      this.items.push(newItem);
      this.draw();
    }
    return newItem;
  }

  public importItems(
    items: ExportedWhiteboardItem<WhiteboardItemType>[],
    shouldThrow = false
  ): void {
    this.items = items
      .map((item) => this.importItem(item, shouldThrow))
      .filter((item) => item !== null);

    // Loading a fresh set of items becomes the new history baseline (unless we
    // are ourselves restoring a snapshot, in which case the history is driving).
    if (!this.isRestoringHistory) {
      this.resetHistory();
    }
  }

  public setItems(items: WhiteboardItem<WhiteboardItemType>[]) {
    this.items = items;
    this.draw();
  }

  public addItem(
    item: WhiteboardItem<WhiteboardItemType>,
    sendEvent: boolean = true
  ) {
    this.items.push(item);
    this.draw();

    if (sendEvent) {
      const itemsUpdatedEvent = new CustomEvent("items-updated", {
        detail: {
          type: "add",
          item: item.export(),
        },
      });
      this.dispatchEvent(itemsUpdatedEvent);
    }

    // Adds that happen outside a pointer interaction (e.g. inserting a picture)
    // are committed right away. Adds during an interaction are committed once
    // at the end of that interaction instead.
    if (!this.isInteracting) {
      this.commitHistory();
    }
  }

  private getItemIndexById(itemId: string): number | null {
    const index = this.items.findIndex((item) => item.getId() === itemId);
    if (index === -1) {
      return null;
    }
    return index;
  }

  public getItemById(
    itemId: string
  ): WhiteboardItem<WhiteboardItemType> | null {
    const index = this.getItemIndexById(itemId);
    if (index === null) {
      return null;
    }
    return this.items[index];
  }

  public updateItem(itemId: string, item: WhiteboardItem<WhiteboardItemType>) {
    const index = this.getItemIndexById(itemId);
    if (index === null) {
      return;
    }

    this.items[index] = item;
    this.draw();
  }

  public partialItemUpdateById(
    itemId: string,
    updates: Partial<WhiteboardItemType>,
    sendEvent = true
  ) {
    const index = this.getItemIndexById(itemId);
    if (index === null) {
      return;
    }
    this.items[index].partialUpdate(updates);
    this.draw();
    this.requestUpdate();

    if (sendEvent) {
      const itemsUpdatedEvent = new CustomEvent("items-updated", {
        detail: {
          type: "partial-update",
          itemId,
          updates,
        },
      });
      this.dispatchEvent(itemsUpdatedEvent);
    }
  }

  public clear() {
    this.resetWhiteboard();
    this.draw();
  }

  // --- Undo / redo history ---------------------------------------------------

  /**
   * Serialize the current board state to a comparable snapshot.
   */
  private snapshotItems(): string {
    return JSON.stringify(this.exportItems());
  }

  /**
   * Reset the undo/redo history so the current state becomes the baseline.
   * Nothing before it can be undone.
   */
  private resetHistory(): void {
    this.history.reset(this.snapshotItems());
    this.requestUpdate();
    this.dispatchHistoryChanged();
  }

  /**
   * Record the current board state as a new undo step.
   * Does nothing if the state has not changed since the last step, or if a
   * snapshot is currently being restored.
   */
  public commitHistory(): void {
    if (this.isRestoringHistory) {
      return;
    }
    if (this.history.push(this.snapshotItems())) {
      this.requestUpdate();
      this.dispatchHistoryChanged();
    }
  }

  /**
   * Restore the board to a previously recorded snapshot.
   *
   * @param snapshot The JSON snapshot to restore.
   */
  private restoreHistoryState(snapshot: string): void {
    this.isRestoringHistory = true;
    // Dispose the current items first so their DOM overlays (e.g. the text
    // editor) are cleaned up, then rebuild from the snapshot.
    this.resetWhiteboard();
    const items = JSON.parse(snapshot) as ExportedWhiteboardItem<
      WhiteboardItemType
    >[];
    this.importItems(items);
    this.isRestoringHistory = false;
    this.draw();
    this.requestUpdate();

    // Let hosts (e.g. a collaborative layer) react to the full new state.
    this.dispatchEvent(
      new CustomEvent("items-updated", {
        detail: { type: "set", items: this.exportItems() },
      })
    );
    this.dispatchHistoryChanged();
  }

  /**
   * Whether there is a change that can be undone.
   */
  public canUndo(): boolean {
    return this.history.canUndo();
  }

  /**
   * Whether there is a change that can be redone.
   */
  public canRedo(): boolean {
    return this.history.canRedo();
  }

  /**
   * Undo the last change.
   */
  public undo(): void {
    // Flush any pending change first, so it can be redone afterwards.
    this.commitHistory();
    const snapshot = this.history.undo();
    if (snapshot !== undefined) {
      this.restoreHistoryState(snapshot);
    }
  }

  /**
   * Redo the last undone change.
   */
  public redo(): void {
    this.commitHistory();
    const snapshot = this.history.redo();
    if (snapshot !== undefined) {
      this.restoreHistoryState(snapshot);
    }
  }

  /**
   * Notify listeners that the undo/redo availability changed.
   */
  private dispatchHistoryChanged(): void {
    this.dispatchEvent(
      new CustomEvent("history-changed", {
        detail: { canUndo: this.canUndo(), canRedo: this.canRedo() },
      })
    );
  }

  public getPreviousTool() {
    return this.previousTool;
  }

  public getCurrentTool() {
    return this.currentTool;
  }

  public setCurrentTool(tool: string, updatePreviousTool = true) {
    const previousToolInstance = this.registeredTools.get(this.currentTool);
    if (previousToolInstance) {
      previousToolInstance.onToolUnselected();
    }
    if (updatePreviousTool) {
      this.previousTool = this.currentTool;
    }
    this.currentTool = tool;

    const toolInstance = this.registeredTools.get(tool);
    if (toolInstance) {
      toolInstance.onToolSelected();
      const toolUpdatedEvent = new CustomEvent("tool-updated", {
        detail: {
          type: "select",
          name: toolInstance.getName(),
        },
      });
      this.dispatchEvent(toolUpdatedEvent);
    }
  }

  public setHoveredItemId(itemId: string | null) {
    if (itemId !== this.hoveredItemId) {
      this.hoveredItemId = itemId;
      this.draw();
    }
  }

  public getHoveredItemId(): string | null {
    return this.hoveredItemId;
  }

  public getHoveredItem(): WhiteboardItem<WhiteboardItemType> | null {
    if (!this.hoveredItemId) {
      return null;
    }

    return this.getItemById(this.hoveredItemId);
  }

  public setSelectedItemId(itemId: string | null) {
    this.selectedItemId = itemId;
  }

  public getSelectedItemId(): string | null {
    return this.selectedItemId;
  }

  public getToolInstance(
    toolName: string
  ): WhiteboardTool<WhiteboardItem<WhiteboardItemType>> | undefined {
    return this.registeredTools.get(toolName);
  }

  public getSelectedItem(): WhiteboardItem<WhiteboardItemType> | null {
    if (!this.selectedItemId) {
      return null;
    }

    return this.getItemById(this.selectedItemId);
  }

  public updateItemById(
    itemId: string,
    item: WhiteboardItem<WhiteboardItemType>,
    sendEvent = false
  ) {
    const index = this.getItemIndexById(itemId);
    if (index === null) {
      return;
    }

    this.items[index] = item;
    this.draw();

    if (sendEvent) {
      const itemsUpdatedEvent = new CustomEvent("items-updated", {
        detail: {
          type: "update",
          itemId,
          item,
        },
      });
      this.dispatchEvent(itemsUpdatedEvent);
    }

    this.requestUpdate();
  }

  /**
   * Remove an item by its ID.
   *
   * @param itemId The ID of the item to remove.
   * @param sendEvent Whether to send an event to notify the removal of the item.
   */
  public removeItemById(itemId: string, sendEvent = false): void {
    const index = this.getItemIndexById(itemId);
    if (index === null) {
      return;
    }

    // Remove the items from the list and call the callback function on items
    this.items.splice(index, 1).forEach((item) => item.onRemove());
    this.draw();

    if (sendEvent) {
      const itemsUpdatedEvent = new CustomEvent("items-updated", {
        detail: {
          type: "remove",
          itemId,
        },
      });
      this.dispatchEvent(itemsUpdatedEvent);

      // A local removal is an undoable action (remote ones, with
      // `sendEvent = false`, are not recorded locally). Removals that happen
      // during a pointer interaction (e.g. dragging the eraser across several
      // items) are committed once at the end of the interaction, so the whole
      // stroke is a single undo step.
      if (!this.isInteracting) {
        this.commitHistory();
      }
    }

    this.requestUpdate();
  }

  // --- Item stacking order (z-order) -----------------------------------------
  //
  // Items are drawn in array order: the first item is at the back, the last one
  // is on top. Reordering the array therefore changes which item is drawn over
  // which.

  /**
   * Move an item to a specific position in the stacking order.
   *
   * @param itemId The ID of the item to move.
   * @param toIndex The target index (clamped to the valid range).
   * @param sendEvent Whether to notify listeners (and record an undo step).
   */
  public moveItemToIndex(
    itemId: string,
    toIndex: number,
    sendEvent = true
  ): void {
    const fromIndex = this.getItemIndexById(itemId);
    if (fromIndex === null) {
      return;
    }

    const target = clamp(toIndex, 0, this.items.length - 1);
    if (target === fromIndex) {
      return;
    }

    const [item] = this.items.splice(fromIndex, 1);
    this.items.splice(target, 0, item);
    this.draw();
    this.requestUpdate();

    if (sendEvent) {
      this.dispatchEvent(
        new CustomEvent("items-updated", {
          detail: {
            type: "reorder",
            itemId,
            toIndex: target,
            // Full resulting order, so remote clients can reproduce it robustly.
            order: this.items.map((current) => current.getId()),
          },
        })
      );
      this.commitHistory();
    }
  }

  /**
   * Move an item one step towards the front (drawn on top).
   */
  public moveItemForward(itemId: string, sendEvent = true): void {
    const index = this.getItemIndexById(itemId);
    if (index === null) {
      return;
    }
    this.moveItemToIndex(itemId, index + 1, sendEvent);
  }

  /**
   * Move an item one step towards the back (drawn behind).
   */
  public moveItemBackward(itemId: string, sendEvent = true): void {
    const index = this.getItemIndexById(itemId);
    if (index === null) {
      return;
    }
    this.moveItemToIndex(itemId, index - 1, sendEvent);
  }

  /**
   * Move an item all the way to the front.
   */
  public bringItemToFront(itemId: string, sendEvent = true): void {
    this.moveItemToIndex(itemId, this.items.length - 1, sendEvent);
  }

  /**
   * Move an item all the way to the back.
   */
  public sendItemToBack(itemId: string, sendEvent = true): void {
    this.moveItemToIndex(itemId, 0, sendEvent);
  }

  /**
   * Reorder every item to match the given list of IDs. Items whose ID is not in
   * the list keep their relative order and are appended at the end. This is
   * used to apply a stacking-order change coming from another client.
   *
   * @param orderIds The desired order, as a list of item IDs.
   * @param sendEvent Whether to notify listeners (and record an undo step).
   */
  public applyItemsOrder(orderIds: string[], sendEvent = false): void {
    const byId = new Map(this.items.map((item) => [item.getId(), item]));
    const reordered: WhiteboardItem<WhiteboardItemType>[] = [];

    for (const id of orderIds) {
      const item = byId.get(id);
      if (item) {
        reordered.push(item);
        byId.delete(id);
      }
    }
    // Keep any items that were not referenced in the order.
    for (const item of this.items) {
      if (byId.has(item.getId())) {
        reordered.push(item);
      }
    }

    this.items = reordered;
    this.draw();
    this.requestUpdate();

    if (sendEvent) {
      this.dispatchEvent(
        new CustomEvent("items-updated", {
          detail: {
            type: "reorder",
            order: this.items.map((item) => item.getId()),
          },
        })
      );
      this.commitHistory();
    }
  }

  /**
   * Trigger the download of the current canvas as a PNG image.
   *
   * @param options Options for the download.
   */
  public downloadCurrentCanvasAsPng(options?: {
    fileName?: string;
    backgroundColor?: string;
  }): void {
    if (!this.canvas) {
      return;
    }

    // Make sure the latest state is rendered before capturing the pixels, as
    // redraws are otherwise deferred to the next animation frame.
    this.flushDraw();
    downloadCanvasAsPng(this.canvas, options);
  }

  // --- Full-view and selected-area export ------------------------------------

  /**
   * Compute the world-space bounding box that encloses every item, or `null`
   * when the board is empty.
   */
  private getItemsBoundingBox(): BoundingRect | null {
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    for (const item of this.items) {
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
   * Render a world-space region onto a fresh, detached canvas and return it.
   *
   * This re-renders the items (and the dotted background, if enabled) through a
   * dedicated coordinate system that maps the region onto the output canvas, so
   * the result is independent of the current pan/zoom. The selection and hover
   * boxes and the tool overlays are never included. Used by the export helpers.
   *
   * @param worldRect The region to render, in world coordinates.
   * @param options `scale` = output pixels per world unit; `padding` = margin
   *   around the region, in world units.
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
    if (this.dottedBackground) {
      drawDottedBackground(ctx, coords.toCamera(), canvas.width, canvas.height);
    }

    const roughCanvas = rough.canvas(canvas, { options: { seed: 42 } });
    const drawingContext: DrawingContext = { canvas: ctx, roughCanvas, coords };
    this.items.forEach((item) => {
      const box = item.getBoundingBox();
      if (box && !rectsIntersect(box, region)) {
        return;
      }
      item.draw(drawingContext);
    });

    return canvas;
  }

  /**
   * Pick an output scale (pixels per world unit) for exporting a region: 2x for
   * crispness, but reduced so the largest side never exceeds a sane limit — an
   * enormous board therefore never produces a gigantic image. Zoom-independent,
   * so the same content always exports at the same resolution.
   */
  private exportScaleFor(rect: BoundingRect): number {
    const MAX_DIMENSION = 4096;
    const longestSide = Math.max(rect.width, rect.height) || 1;
    return Math.min(2, MAX_DIMENSION / longestSide);
  }

  /**
   * Download every item on the board as a single PNG, framed to their combined
   * bounding box — regardless of the current pan and zoom. Falls back to the
   * current view when the board is empty.
   *
   * @param options Options for the download.
   */
  public downloadFullViewAsPng(options?: CanvasPngExportOptions): void {
    const bbox = this.getItemsBoundingBox();
    if (!bbox) {
      this.downloadCurrentCanvasAsPng(options);
      return;
    }

    const canvas = this.renderRegionToCanvas(bbox, {
      scale: this.exportScaleFor(bbox),
      padding: 24,
    });
    downloadCanvasAsPng(canvas, options);
    canvas.remove();
    // Re-render on-screen: the off-screen pass may have touched transient item
    // state (e.g. a text item's editing flag).
    this.draw();
  }

  /**
   * Download an arbitrary world-space region as a PNG.
   *
   * @param worldRect The region to export, in world coordinates.
   * @param options Options for the download.
   */
  public downloadRegionAsPng(
    worldRect: BoundingRect,
    options?: CanvasPngExportOptions
  ): void {
    if (worldRect.width <= 0 || worldRect.height <= 0) {
      return;
    }

    const canvas = this.renderRegionToCanvas(worldRect, {
      scale: this.exportScaleFor(worldRect),
      padding: 0,
    });
    downloadCanvasAsPng(canvas, options);
    canvas.remove();
    this.draw();
  }

  /**
   * Enter "export a selected area" mode: the next pointer drag on the canvas
   * draws a rectangle, and releasing exports that region as a PNG. Press Escape
   * to cancel.
   *
   * @param options Options for the resulting download.
   */
  public startAreaExport(options?: CanvasPngExportOptions): void {
    this.exportAreaOptions = options ?? {};
    this.isSelectingExportArea = true;
    this.exportAreaStart = null;
    this.exportAreaCurrent = null;
    this.setCursor("crosshair");
    this.draw();
    this.requestUpdate();
  }

  /**
   * Cancel an in-progress "export selected area" gesture without exporting.
   */
  public cancelAreaExport(): void {
    this.exitAreaExport();
  }

  /**
   * Finish the "export selected area" gesture: export the picked region (unless
   * it is too small to be intentional) and leave the mode.
   */
  private finishAreaExport(): void {
    const start = this.exportAreaStart;
    const current = this.exportAreaCurrent;
    const options = this.exportAreaOptions;
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

    const topLeft = this.coordsContext.convertFromCanvas(x1, y1);
    const bottomRight = this.coordsContext.convertFromCanvas(x2, y2);
    this.downloadRegionAsPng(
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
   * Leave "export selected area" mode and reset its state.
   */
  private exitAreaExport(): void {
    this.isSelectingExportArea = false;
    this.exportAreaStart = null;
    this.exportAreaCurrent = null;
    this.setCursor("default");
    this.draw();
    this.requestUpdate();
  }

  /**
   * Get the canvas element.
   * @returns The canvas element.
   */
  public getCanvasElement(): HTMLCanvasElement | undefined {
    return this.canvas;
  }

  /**
   * Set the cursor style for the whiteboard.
   */
  public setCursor(cursor: string): void {
    this.cursor = cursor;
    this.requestUpdate("cursor", this.cursor);
  }
}
