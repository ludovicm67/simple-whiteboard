import {
  LitElement,
  PropertyDeclaration,
  PropertyValues,
  TemplateResult,
  html,
} from "lit";
import rough from "roughjs";
import { customElement, property, state } from "lit/decorators.js";
import { I18nContext } from "./lib/locales";
import { WhiteboardTool } from "./lib/tool";
import {
  ExportedWhiteboardItem,
  WhiteboardItem,
  WhiteboardItemType,
} from "./lib/item";
import { DrawingContext, Point } from "./lib/types";
import { CoordsContext } from "./lib/coords";
import { clamp, distance, midpoint, rectsIntersect } from "./lib/geometry";
import { drawDottedBackground } from "./lib/background";
import { downloadCanvasAsPng } from "./lib/canvasExport";
import { ToolbarTooltip } from "./lib/toolbarTooltip";
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
   * Disabled by default. Toggle it with the `dotted-background` attribute.
   */
  @property({ type: Boolean, attribute: "dotted-background" })
  dottedBackground = false;

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
  }

  handleKeyDown(e: KeyboardEvent) {
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
      return;
    }
    tool.handleDrawingEnd();
    this.draw();
  }

  handleMouseDown(e: MouseEvent) {
    // Middle-click pans the canvas, regardless of the currently selected tool.
    if (e.button === 1) {
      e.preventDefault();
      this.startPan(e);
      return;
    }
    this.handleDrawingStart(e.offsetX, e.offsetY);
  }

  handleMouseMove(e: MouseEvent) {
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
  }

  renderToolsOptions(): TemplateResult | null {
    const selectedItem = this.getSelectedItem();
    const currentTool = this.registeredTools.get(this.currentTool);
    const selectedItemTool = selectedItem
      ? this.registeredTools.get(selectedItem.getType())
      : null;
    const tool = selectedItemTool || currentTool;
    if (!tool) {
      return null;
    }
    const options = tool.renderToolOptions(selectedItem);
    if (!options) {
      return null;
    }
    return html`<div class="tools-options">${options}</div>`;
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

  renderFooterTools() {
    return html`<div class="footer-tools">
      ${this.renderZoomSelect()} ${this.renderDebug()}
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
    }

    this.requestUpdate();
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
