import { LitElement, PropertyDeclaration, TemplateResult, html } from "lit";
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
import { styles } from "./styles";
import { item } from "./tools/line";

import "./components/menu";

const getTouchDistance = (touches: TouchList): number => {
  const dx = touches[0].clientX - touches[1].clientX;
  const dy = touches[0].clientY - touches[1].clientY;
  return Math.sqrt(dx * dx + dy * dy);
};

@customElement("simple-whiteboard")
export class SimpleWhiteboard extends LitElement {
  @property({ type: Boolean })
  debug = false;

  @property({ type: Boolean })
  hideLocalePicker = false;

  @property()
  locale: string = "en";

  @state()
  isReady: boolean = false;

  @state()
  private cursor: string = "default";

  private i18nContext: I18nContext = new I18nContext();
  private coordsContext: CoordsContext = new CoordsContext();

  private mouseCoords: Point = { x: 0, y: 0 };

  private canvas?: HTMLCanvasElement;
  private canvasContext?: CanvasRenderingContext2D;

  private lastDistance = 0;
  private lastOrigin: Point = { x: 0, y: 0 };

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

  draw() {
    if (!this.canvas || !this.canvasContext) {
      return;
    }

    const context = this.canvasContext;
    context.clearRect(0, 0, this.canvas.width, this.canvas.height);

    const drawingContext = this.generateDrawingContext();
    this.items.forEach((item) => item.draw(drawingContext));

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
    window.addEventListener("keydown", this.handleKeyDown.bind(this));
    window.addEventListener("resize", this.handleResize.bind(this));
    document.addEventListener(
      "visibilitychange",
      this.handleVisibilityChange.bind(this)
    );
    super.connectedCallback();
  }

  disconnectedCallback(): void {
    this.isReady = false;
    const i18n = this.i18nContext.getInstance();
    i18n.off("languageChanged");
    document.removeEventListener(
      "visibilitychange",
      this.handleVisibilityChange.bind(this)
    );
    window.removeEventListener("resize", this.handleResize.bind(this));
    window.removeEventListener("keydown", this.handleKeyDown.bind(this));
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
    this.handleDrawingStart(e.offsetX, e.offsetY);
  }

  handleMouseMove(e: MouseEvent) {
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
    this.handleDrawingEnd();
  }

  handleTouchStart(e: TouchEvent) {
    if (e.touches.length < 1 || !this.canvas) {
      return;
    }

    // Prevent the default action to prevent scrolling
    e.preventDefault();

    // Handle zooming
    if (e.touches.length === 2) {
      // Set the zoom origin to the midpoint between the fingers
      this.lastOrigin = {
        x:
          (e.touches[0].clientX + e.touches[1].clientX) / 2 -
          this.canvas.offsetLeft,
        y:
          (e.touches[0].clientY + e.touches[1].clientY) / 2 -
          this.canvas.offsetTop,
      };
      this.lastDistance = getTouchDistance(e.touches);
    }

    // Get the first touch
    const touch = e.touches[0];

    // Get the position of the touch relative to the canvas
    const rect = this.canvas.getBoundingClientRect();

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

    // Handle zooming
    if (e.touches.length === 2) {
      const origin = {
        x:
          (e.touches[0].clientX + e.touches[1].clientX) / 2 -
          this.canvas.offsetLeft,
        y:
          (e.touches[0].clientY + e.touches[1].clientY) / 2 -
          this.canvas.offsetTop,
      };
      const dx = origin.x - this.lastOrigin.x;
      const dy = origin.y - this.lastOrigin.y;
      this.lastOrigin = origin;

      const { x, y } = this.coordsContext.getCoords();
      this.coordsContext.setCoords(x + dx, y + dy);

      const distance = getTouchDistance(e.touches);
      const zoomFactor = distance / this.lastDistance;
      this.lastDistance = distance;

      const zoom = this.coordsContext.getZoom() * zoomFactor;
      this.setZoom(zoom);
      return;
    }

    // Get the first touch
    const touch = e.touches[0];

    // Get the position of the touch relative to the canvas
    const rect = this.canvas.getBoundingClientRect();

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
      // Zoom in or out
      const zoomFactor = e.deltaY > 0 ? 1 - scaleFactor : 1 + scaleFactor;
      const zoom = this.coordsContext.getZoom() * zoomFactor;
      this.setZoom(zoom);
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

  renderToolsList() {
    const tools = [];

    for (const [toolName, tool] of this.registeredTools) {
      const icon = tool.getIcon();
      if (!icon) {
        continue;
      }

      const button = html`<button
        class=${this.currentTool === toolName ? "tools--active" : ""}
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

  setZoom(zoom: number) {
    this.coordsContext.setZoom(Math.max(0.25, Math.min(4, zoom)));
    this.draw();
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

    const opts = options || {};
    const fileName = opts.fileName || "whiteboard.png";
    const backgroundColor = opts.backgroundColor || "#ffffff";

    // Create a temporary canvas
    const tempCanvas = document.createElement("canvas");
    tempCanvas.width = this.canvas.width;
    tempCanvas.height = this.canvas.height;

    // Draw the background
    const tempCanvasContext = tempCanvas.getContext("2d");
    if (!tempCanvasContext) {
      return;
    }
    tempCanvasContext.fillStyle = backgroundColor;
    tempCanvasContext.fillRect(0, 0, tempCanvas.width, tempCanvas.height);

    // Draw the whiteboard
    tempCanvasContext.drawImage(this.canvas, 0, 0);

    // Create a link and download the image
    const link = document.createElement("a");
    link.download = fileName;
    link.href = tempCanvas.toDataURL("image/png");
    link.click();

    // Revoke the object URL
    URL.revokeObjectURL(link.href);

    // Remove temporary canvas
    tempCanvas.remove();

    // Remove the link
    link.remove();
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
