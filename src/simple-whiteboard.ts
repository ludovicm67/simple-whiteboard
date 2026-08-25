import { LitElement, PropertyDeclaration, PropertyValues, html } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import { I18nContext } from "./lib/locales";
import { WhiteboardTool } from "./lib/tool";
import {
  ExportedWhiteboardItem,
  WhiteboardItem,
  WhiteboardItemType,
} from "./lib/item";
import { DrawingContext, Point, BoundingRect } from "./lib/types";
import { CoordsContext } from "./lib/coords";
import { clamp } from "./lib/geometry";
import {
  downloadCanvasAsPng,
  CanvasPngExportOptions,
} from "./lib/canvasExport";
import { ToolbarTooltip } from "./lib/toolbarTooltip";
import { HistoryController } from "./controllers/history";
import { ExportController } from "./controllers/export";
import { CanvasRenderer } from "./controllers/renderer";
import { PointerInputController } from "./controllers/input";
import { renderFooterTools } from "./render/footer";
import { renderToolsOptions } from "./render/toolOptions";
import { ItemStore } from "./controllers/items";
import { styles } from "./styles";

import "./components/menu";

@customElement("simple-whiteboard")
export class SimpleWhiteboard extends LitElement {
  @property({ type: Boolean })
  debug = false;

  @property({ type: Boolean, attribute: "hide-locale-picker" })
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

  // Text announced to assistive technology after a keyboard action (selecting,
  // deleting, …). The canvas itself is opaque to screen readers, so what
  // happens on it has to be said out loud.
  @state()
  private status: string = "";

  private i18nContext: I18nContext = new I18nContext();
  private coordsContext: CoordsContext = new CoordsContext();

  private mouseCoords: Point = { x: 0, y: 0 };

  // Resize handle currently under the pointer, highlighted by the renderer.
  private hoveredResizeHandle: string | null = null;

  private canvas?: HTMLCanvasElement;

  // Pointer input: mouse/touch/wheel/pan/pinch. See `controllers/input.ts`.
  private readonly input = new PointerInputController(this);

  // Canvas rendering + rAF-coalesced redraws. See `controllers/renderer.ts`.
  private readonly renderer = new CanvasRenderer(this);

  // PNG export beyond the current view (full board / selected area), including
  // the area-selection gesture. See `controllers/export.ts`.
  private readonly exporter = new ExportController(this);

  // Undo/redo history (snapshot-based). See `controllers/history.ts`.
  private readonly history = new HistoryController(this);

  // The data model: items, selection and hover. See `controllers/items.ts`.
  private readonly store = new ItemStore(this);

  // `true` between a drawing start and end (a pointer interaction). Item changes
  // during an interaction are committed once, at the end, as a single step.
  private interacting = false;

  // Manages the little tooltip shown under the toolbar buttons.
  private toolbarTooltip = new ToolbarTooltip(() => this.shadowRoot);

  // Bound event handlers, kept as stable references so they can actually be
  // removed again on disconnect.
  private readonly onKeyDown = (e: KeyboardEvent) => this.handleKeyDown(e);
  private readonly onResize = () => this.handleResize();
  private readonly onVisibilityChange = () => this.handleVisibilityChange();

  @state() private registeredTools: Map<
    string,
    WhiteboardTool<WhiteboardItem<WhiteboardItemType>>
  > = new Map();

  @state() private currentTool: string = "";
  @state() private previousTool: string = "";

  static styles = styles;

  protected firstUpdated(): void {
    this.canvas = this.shadowRoot?.querySelector("canvas") || undefined;
    if (!this.canvas) {
      throw new Error("Canvas not found");
    }
    // Ensure a 2D context is available (the renderer derives it from the canvas).
    if (!this.canvas.getContext("2d")) {
      throw new Error("Canvas context not found");
    }
    this.handleResize();

    // Establish the initial history baseline (usually an empty board).
    this.history.reset();

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
    item: WhiteboardItem<WhiteboardItemType>,
  ): { x: number; y: number; width: number; height: number } | null {
    return item.getBoundingBox();
  }

  drawItemBox(
    context: CanvasRenderingContext2D,
    item: WhiteboardItem<WhiteboardItemType>,
    boxColor?: string,
    isResizable = false,
  ): void {
    this.renderer.drawItemBox(context, item, boxColor, isResizable);
  }

  generateDrawingContext(): DrawingContext {
    return this.renderer.generateDrawingContext();
  }

  /**
   * Request a redraw of the canvas.
   *
   * Redraws are coalesced using `requestAnimationFrame`: calling this many
   * times within the same frame results in a single render. This keeps CPU
   * usage low during intensive interactions such as drawing or panning.
   */
  public draw(): void {
    this.renderer.draw();
  }

  /**
   * Force a synchronous redraw, cancelling any pending scheduled one.
   * Used when the canvas pixels need to be up-to-date immediately (e.g. before
   * exporting the canvas as an image).
   */
  private flushDraw(): void {
    this.renderer.flush();
  }

  /**
   * Draw the transient overlays on top of the rendered items and boxes: the
   * active tool's overlay (e.g. the eraser cursor) and, while picking an area
   * to export, the selection marquee. Called by the renderer; never exported.
   */
  drawOverlays(
    drawingContext: DrawingContext,
    context: CanvasRenderingContext2D,
    width: number,
    height: number,
  ): void {
    const activeTool = this.registeredTools.get(this.currentTool);
    activeTool?.drawOverlay(drawingContext);
    this.exporter.drawMarquee(context, width, height);
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

  /**
   * Announce something in the live region. The text is re-set even when it does
   * not change (with a zero-width space) so repeated actions are still spoken.
   */
  private announce(message: string): void {
    this.status = this.status === message ? `${message}\u200b` : message;
  }

  /** The localized name of an item's kind, e.g. "Rectangle". */
  private itemLabel(item: WhiteboardItem<WhiteboardItemType>): string {
    return this.i18nContext.t(`tool-tooltip-${item.getType()}`);
  }

  /** Whether the keyboard event happened while the canvas had focus. */
  private isCanvasFocused(e: Event): boolean {
    const path = (e.composedPath && e.composedPath()) || [];
    return !!this.canvas && path.includes(this.canvas);
  }

  /**
   * Move the selection to the next (or previous) item and announce it.
   * Clicking is not the only way to reach an item: this makes selecting one
   * possible from the keyboard alone.
   */
  private selectAdjacentItem(direction: number): void {
    const items = this.getItems();
    if (items.length === 0) {
      this.announce(this.i18nContext.t("whiteboard-empty"));
      return;
    }

    const currentId = this.getSelectedItemId();
    const current = items.findIndex((item) => item.getId() === currentId);
    const next =
      current < 0
        ? direction > 0
          ? 0
          : items.length - 1
        : (current + direction + items.length) % items.length;

    const item = items[next];
    this.setSelectedItemId(item.getId());
    this.draw();
    this.announce(
      this.i18nContext.t("whiteboard-selected", {
        name: this.itemLabel(item),
        index: next + 1,
        total: items.length,
      })
    );
  }

  /** Nudge the selected item with the arrow keys. */
  private moveSelectedItem(dx: number, dy: number): boolean {
    const item = this.getSelectedItem();
    if (!item) {
      return false;
    }
    const update = item.relativeMoveOperation(dx, dy);
    if (update === null) {
      return false;
    }
    this.partialItemUpdateById(item.getId(), update, true);
    this.history.commit();
    return true;
  }

  /**
   * Keyboard shortcuts available while the canvas has focus. Drawing itself is
   * a pointer gesture, but everything around it — picking an item, moving it,
   * deleting it — has to work from the keyboard too.
   */
  private handleCanvasKeyDown(e: KeyboardEvent): boolean {
    const nudge: Record<string, [number, number]> = {
      ArrowLeft: [-1, 0],
      ArrowRight: [1, 0],
      ArrowUp: [0, -1],
      ArrowDown: [0, 1],
    };

    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      this.selectAdjacentItem(e.shiftKey ? -1 : 1);
      return true;
    }

    if (e.key === "Escape" && this.getSelectedItemId()) {
      e.preventDefault();
      this.setSelectedItemId(null);
      this.draw();
      this.announce(this.i18nContext.t("whiteboard-selection-cleared"));
      return true;
    }

    if (e.key in nudge) {
      const [dx, dy] = nudge[e.key];
      const step = (e.shiftKey ? 10 : 1) / this.coordsContext.getZoom();
      if (this.moveSelectedItem(dx * step, dy * step)) {
        e.preventDefault();
        return true;
      }
      // Nothing selected: pan the view instead, so the board stays explorable.
      e.preventDefault();
      const { x, y } = this.coordsContext.getCoords();
      const panStep = e.shiftKey ? 100 : 20;
      this.coordsContext.setCoords(x - dx * panStep, y - dy * panStep);
      this.draw();
      return true;
    }

    return false;
  }

  handleKeyDown(e: KeyboardEvent) {
    const isModifier = e.metaKey || e.ctrlKey;
    const key = e.key.toLowerCase();

    // Escape cancels an in-progress "export selected area" gesture.
    if (e.key === "Escape" && this.exporter.isSelectingArea) {
      e.preventDefault();
      this.exporter.cancelAreaExport();
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

    // If it is the backspace (or delete) key, we remove the selected item
    if (e.key === "Backspace" || e.key === "Delete") {
      const selectedItem = this.getSelectedItem();
      if (
        selectedItem &&
        selectedItem.isRemovableWithBackspace() &&
        !this.isEditableTarget(e)
      ) {
        const name = this.itemLabel(selectedItem);
        this.removeItemById(selectedItem.getId(), true);
        this.announce(
          this.i18nContext.t("whiteboard-removed", { name })
        );
        return;
      }
    }

    // Everything else only applies while the drawing surface itself has focus.
    if (!this.isEditableTarget(e) && this.isCanvasFocused(e)) {
      this.handleCanvasKeyDown(e);
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

    // The input controller (a ReactiveController) ends any in-progress pan and
    // removes its window listeners via `hostDisconnected`.

    // Cancel any pending redraw so we do not run after being detached.
    this.renderer.cancel();
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
    this.interacting = true;
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
      this.interacting = false;
      return;
    }
    tool.handleDrawingEnd();
    this.interacting = false;
    this.draw();
    // Record the whole interaction (draw / drag / resize) as a single step.
    this.commitHistory();
  }

  // --- Pointer input ---------------------------------------------------------
  //
  // The gesture logic (mouse drawing, middle-click pan, touch pan/pinch, wheel)
  // lives in `PointerInputController`. These handlers are bound in the template;
  // they route the "export selected area" marquee (which owns the exporter) and
  // otherwise delegate to the input controller.

  handleMouseDown(e: MouseEvent) {
    if (this.exporter.isSelectingArea) {
      if (e.button === 0) {
        this.exporter.pointerDown(e.offsetX, e.offsetY);
      }
      return;
    }
    this.input.mouseDown(e);
  }

  handleMouseMove(e: MouseEvent) {
    if (this.exporter.isSelectingArea) {
      this.exporter.pointerMove(e.offsetX, e.offsetY);
      return;
    }
    this.input.mouseMove(e);
  }

  handleMouseUp() {
    if (this.exporter.isSelectingArea) {
      this.exporter.pointerUp();
      return;
    }
    this.input.mouseUp();
  }

  handleTouchStart(e: TouchEvent) {
    if (this.exporter.isSelectingArea) {
      this.exportAreaTouch(e, (x, y) => this.exporter.pointerDown(x, y));
      return;
    }
    this.input.touchStart(e);
  }

  handleTouchMove(e: TouchEvent) {
    if (this.exporter.isSelectingArea) {
      this.exportAreaTouch(e, (x, y) => this.exporter.pointerMove(x, y));
      return;
    }
    this.input.touchMove(e);
  }

  handleTouchEnd() {
    if (this.exporter.isSelectingArea) {
      this.exporter.pointerUp();
      return;
    }
    this.input.touchEnd();
  }

  handleTouchCancel() {
    this.input.touchCancel();
  }

  handleWheel(e: WheelEvent) {
    this.input.wheel(e);
  }

  /**
   * Route a one-finger touch to the export-area marquee, in canvas-relative
   * coordinates.
   */
  private exportAreaTouch(
    e: TouchEvent,
    apply: (x: number, y: number) => void,
  ): void {
    if (e.touches.length < 1 || !this.canvas) {
      return;
    }
    e.preventDefault();
    const rect = this.canvas.getBoundingClientRect();
    const touch = e.touches[0];
    apply(touch.clientX - rect.left, touch.clientY - rect.top);
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
    tool: WhiteboardTool<WhiteboardItem<WhiteboardItemType>>,
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
    options?: PropertyDeclaration<unknown, unknown> | undefined,
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
    this.store.reset();
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

  /**
   * Move focus between the toolbar buttons with the arrow keys, as a toolbar
   * is expected to behave: the toolbar is a single tab stop, and the arrows
   * (plus Home/End) walk it. Focus moves without activating, so a keyboard
   * user can look around before committing to a tool.
   */
  private handleToolbarKeyDown(e: KeyboardEvent): void {
    const steps: Record<string, number> = {
      ArrowRight: 1,
      ArrowDown: 1,
      ArrowLeft: -1,
      ArrowUp: -1,
    };
    const isEdge = e.key === "Home" || e.key === "End";
    if (!(e.key in steps) && !isEdge) {
      return;
    }

    const toolbar = e.currentTarget as HTMLElement;
    const buttons = Array.from(toolbar.querySelectorAll("button"));
    if (buttons.length === 0) {
      return;
    }

    e.preventDefault();
    const current = buttons.indexOf(
      (this.shadowRoot?.activeElement as HTMLButtonElement) ?? buttons[0]
    );
    let next: number;
    if (e.key === "Home") {
      next = 0;
    } else if (e.key === "End") {
      next = buttons.length - 1;
    } else {
      const from = current < 0 ? 0 : current;
      next = (from + steps[e.key] + buttons.length) % buttons.length;
    }
    buttons[next].focus();
  }

  renderToolsList() {
    const i18n = this.i18nContext;
    const entries = [...this.registeredTools].filter(
      ([, tool]) => tool.getIcon() !== null
    );

    if (entries.length === 0) {
      return null;
    }

    // Roving tabindex: the toolbar is one tab stop, landing on the active tool.
    const activeIndex = Math.max(
      0,
      entries.findIndex(([toolName]) => toolName === this.currentTool)
    );

    const tools = entries.map(([toolName, tool], index) => {
      const label = this.getToolTooltip(toolName);
      const isActive = this.currentTool === toolName;
      return html`<button
        class=${isActive ? "tools--active" : ""}
        aria-label=${label}
        title=${label}
        aria-pressed=${isActive}
        tabindex=${index === activeIndex ? 0 : -1}
        @mouseover=${(e: MouseEvent) =>
          this.toolbarTooltip.show(e.target, label)}
        @mouseout=${() => this.toolbarTooltip.hide()}
        @focus=${(e: FocusEvent) => this.toolbarTooltip.show(e.target, label)}
        @blur=${() => this.toolbarTooltip.hide()}
        @click=${(e: Event) => this.handleToolChange(toolName, e)}
      >
        ${tool.getIcon()}
      </button>`;
    });

    return html`<div
      class="tools"
      role="toolbar"
      aria-label=${i18n.t("toolbar-label")}
      @keydown=${(e: KeyboardEvent) => this.handleToolbarKeyDown(e)}
    >
      ${tools}
    </div>`;
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
      screenY,
    );
    this.draw();
    // Keep the footer zoom indicator in sync with wheel/pinch zooming.
    this.requestUpdate();
  }

  /**
   * Get the last known pointer position, in world coordinates. Used by the
   * debug footer readout.
   */
  public getMouseCoords(): Point {
    return this.mouseCoords;
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

        ${this.renderToolsList()} ${renderToolsOptions(this)}
        ${renderFooterTools(this)}

        <canvas
          tabindex="0"
          aria-label=${this.i18nContext.t("whiteboard-label")}
          aria-describedby="whiteboard-hint"
          @mousedown="${this.handleMouseDown}"
          @mouseup="${this.handleMouseUp}"
          @mousemove="${this.handleMouseMove}"
          @wheel="${this.handleWheel}"
          @touchstart="${this.handleTouchStart}"
          @touchmove="${this.handleTouchMove}"
          @touchend="${this.handleTouchEnd}"
          @touchcancel="${this.handleTouchCancel}"
        ></canvas>

        <p id="whiteboard-hint" class="visually-hidden">
          ${this.i18nContext.t("whiteboard-hint")}
        </p>
        <p class="visually-hidden" role="status" aria-live="polite">
          ${this.status}
        </p>
      </div>
    `;
  }

  public getDefaultToolName(): string {
    return "pointer";
  }

  public getItems(): WhiteboardItem<WhiteboardItemType>[] {
    return this.store.getItems();
  }

  public getCoordsContext(): CoordsContext {
    return this.coordsContext;
  }

  public getI18nContext(): I18nContext {
    return this.i18nContext;
  }

  public exportItems(): ExportedWhiteboardItem<WhiteboardItemType>[] {
    return this.store.exportItems();
  }

  public importItem(
    item: ExportedWhiteboardItem<WhiteboardItemType>,
    shouldThrow = false,
  ): WhiteboardItem<WhiteboardItemType> | null {
    return this.store.importItem(item, shouldThrow);
  }

  public importItems(
    items: ExportedWhiteboardItem<WhiteboardItemType>[],
    shouldThrow = false,
  ): void {
    this.store.importItems(items, shouldThrow);
  }

  public setItems(items: WhiteboardItem<WhiteboardItemType>[]) {
    this.store.setItems(items);
  }

  public addItem(
    item: WhiteboardItem<WhiteboardItemType>,
    sendEvent: boolean = true,
  ) {
    this.store.addItem(item, sendEvent);
  }

  /**
   * Get the stacking-order index of an item (0 = back), or `null` if not found.
   */
  public getItemIndexById(itemId: string): number | null {
    return this.store.getItemIndexById(itemId);
  }

  public getItemById(
    itemId: string,
  ): WhiteboardItem<WhiteboardItemType> | null {
    return this.store.getItemById(itemId);
  }

  public updateItem(itemId: string, item: WhiteboardItem<WhiteboardItemType>) {
    this.store.updateItem(itemId, item);
  }

  public partialItemUpdateById(
    itemId: string,
    updates: Partial<WhiteboardItemType>,
    sendEvent = true,
  ) {
    this.store.partialItemUpdateById(itemId, updates, sendEvent);
  }

  public clear() {
    this.store.reset();
    this.draw();
  }

  // --- Undo / redo history ---------------------------------------------------
  //
  // The actual logic lives in `HistoryController`; these are the public,
  // documented entry points that simply delegate to it.

  /**
   * Record the current board state as a new undo step.
   * Does nothing if the state has not changed since the last step, or if a
   * snapshot is currently being restored.
   */
  public commitHistory(): void {
    this.history.commit();
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
    this.history.undo();
  }

  /**
   * Redo the last undone change.
   */
  public redo(): void {
    this.history.redo();
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
    this.store.setHoveredItemId(itemId);
  }

  /**
   * Set (or clear) the resize handle the pointer is currently over, so that it
   * can be highlighted. Redraws only when the hovered handle actually changes.
   *
   * @param name The name of the hovered resize handle, `null` when none is.
   */
  public setHoveredResizeHandle(name: string | null) {
    if (name === this.hoveredResizeHandle) {
      return;
    }
    this.hoveredResizeHandle = name;
    this.draw();
  }

  /**
   * Get the name of the resize handle the pointer is currently over, if any.
   */
  public getHoveredResizeHandle(): string | null {
    return this.hoveredResizeHandle;
  }

  public getHoveredItemId(): string | null {
    return this.store.getHoveredItemId();
  }

  public getHoveredItem(): WhiteboardItem<WhiteboardItemType> | null {
    return this.store.getHoveredItem();
  }

  public setSelectedItemId(itemId: string | null) {
    this.store.setSelectedItemId(itemId);
  }

  public getSelectedItemId(): string | null {
    return this.store.getSelectedItemId();
  }

  public getToolInstance(
    toolName: string,
  ): WhiteboardTool<WhiteboardItem<WhiteboardItemType>> | undefined {
    return this.registeredTools.get(toolName);
  }

  public getSelectedItem(): WhiteboardItem<WhiteboardItemType> | null {
    return this.store.getSelectedItem();
  }

  public updateItemById(
    itemId: string,
    item: WhiteboardItem<WhiteboardItemType>,
    sendEvent = false,
  ) {
    this.store.updateItemById(itemId, item, sendEvent);
  }

  /**
   * Remove an item by its ID.
   *
   * @param itemId The ID of the item to remove.
   * @param sendEvent Whether to send an event to notify the removal of the item.
   */
  public removeItemById(itemId: string, sendEvent = false): void {
    this.store.removeItemById(itemId, sendEvent);
  }

  // --- Item stacking order (z-order) -----------------------------------------
  //
  // Items are drawn in array order: the first item is at the back, the last one
  // is on top. The logic lives in `ItemStore`; these delegate to it.

  /**
   * Move an item to a specific position in the stacking order.
   */
  public moveItemToIndex(
    itemId: string,
    toIndex: number,
    sendEvent = true,
  ): void {
    this.store.moveItemToIndex(itemId, toIndex, sendEvent);
  }

  /**
   * Move an item one step towards the front (drawn on top).
   */
  public moveItemForward(itemId: string, sendEvent = true): void {
    this.store.moveItemForward(itemId, sendEvent);
  }

  /**
   * Move an item one step towards the back (drawn behind).
   */
  public moveItemBackward(itemId: string, sendEvent = true): void {
    this.store.moveItemBackward(itemId, sendEvent);
  }

  /**
   * Move an item all the way to the front.
   */
  public bringItemToFront(itemId: string, sendEvent = true): void {
    this.store.bringItemToFront(itemId, sendEvent);
  }

  /**
   * Move an item all the way to the back.
   */
  public sendItemToBack(itemId: string, sendEvent = true): void {
    this.store.sendItemToBack(itemId, sendEvent);
  }

  /**
   * Reorder every item to match the given list of IDs. Items whose ID is not in
   * the list keep their relative order and are appended at the end. This is
   * used to apply a stacking-order change coming from another client.
   */
  public applyItemsOrder(orderIds: string[], sendEvent = false): void {
    this.store.applyItemsOrder(orderIds, sendEvent);
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
  //
  // The region rendering and the area-selection gesture live in
  // `ExportController`; these are the public entry points that delegate to it.

  /**
   * Download every item on the board as a single PNG, framed to their combined
   * bounding box — regardless of the current pan and zoom. Falls back to the
   * current view when the board is empty.
   *
   * @param options Options for the download.
   */
  public downloadFullViewAsPng(options?: CanvasPngExportOptions): void {
    this.exporter.downloadFullView(options);
  }

  /**
   * Download an arbitrary world-space region as a PNG.
   *
   * @param worldRect The region to export, in world coordinates.
   * @param options Options for the download.
   */
  public downloadRegionAsPng(
    worldRect: BoundingRect,
    options?: CanvasPngExportOptions,
  ): void {
    this.exporter.downloadRegion(worldRect, options);
  }

  /**
   * Enter "export a selected area" mode: the next pointer drag on the canvas
   * draws a rectangle, and releasing exports that region as a PNG. Press Escape
   * to cancel.
   *
   * @param options Options for the resulting download.
   */
  public startAreaExport(options?: CanvasPngExportOptions): void {
    this.exporter.startAreaExport(options);
  }

  /**
   * Cancel an in-progress "export selected area" gesture without exporting.
   */
  public cancelAreaExport(): void {
    this.exporter.cancelAreaExport();
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

  /**
   * Get the current cursor style.
   */
  public getCursor(): string {
    return this.cursor;
  }

  // --- Controller bridge -----------------------------------------------------
  // Small accessors the ItemStore needs to coordinate with the interaction and
  // history state that the element owns.

  /**
   * Whether a pointer interaction (drawing/dragging) is currently in progress.
   */
  public isInteracting(): boolean {
    return this.interacting;
  }

  /**
   * Whether the history is currently restoring a snapshot.
   */
  public isRestoringHistory(): boolean {
    return this.history.isRestoring;
  }

  /**
   * Make the current state the new history baseline.
   */
  public resetHistoryBaseline(): void {
    this.history.reset();
  }
}
