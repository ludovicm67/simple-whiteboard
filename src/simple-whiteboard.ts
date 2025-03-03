import {
  LitElement,
  PropertyDeclaration,
  TemplateResult,
  css,
  html,
} from "lit";
import rough from "roughjs";
import { customElement, property, state } from "lit/decorators.js";
import { localized } from "@lit/localize";
import { RoughCanvas } from "roughjs/bin/canvas";
import SimpleWhiteboardTool, {
  WhiteboardItem,
  BoundingRect,
} from "./lib/SimpleWhiteboardTool";
import { setLocale } from "./lib/locales";
import type { SupportedLocales } from "./lib/locales";

import "./components/menu";
import { allLocales } from "./generated/locale-codes";

type Point = {
  x: number;
  y: number;
};

const getTouchDistance = (touches: TouchList): number => {
  const dx = touches[0].clientX - touches[1].clientX;
  const dy = touches[0].clientY - touches[1].clientY;
  return Math.sqrt(dx * dx + dy * dy);
};

@customElement("simple-whiteboard")
@localized()
export class SimpleWhiteboard extends LitElement {
  @property({ type: Boolean })
  debug = false;

  @property({ type: Boolean })
  hideLocalePicker = false;

  @property()
  locale: SupportedLocales = "en";

  private mouseCoords: Point = { x: 0, y: 0 };

  private canvas?: HTMLCanvasElement;
  private canvasContext?: CanvasRenderingContext2D;

  private lastDistance = 0;
  private lastOrigin: Point = { x: 0, y: 0 };

  @state() private registeredTools: Map<string, SimpleWhiteboardTool> =
    new Map();

  @state() private items: WhiteboardItem[] = [];
  @state() private canvasCoords: { x: number; y: number; zoom: number } = {
    x: 0,
    y: 0,
    zoom: 1,
  };

  @state() private currentTool: string = "";
  @state() private previousTool: string = "";
  @state() private currentDrawing: WhiteboardItem | null = null;

  @state() private selectedItemId: string | null = null;
  @state() private hoveredItemId: string | null = null;

  static styles = css`
    .root {
      height: 100%;
      width: 100%;
      background-color: #fcfcff;
      position: relative;
    }

    .button {
      background-color: rgba(0, 0, 0, 0.05);
      border-radius: 8px;
      padding: 8px;
      border: 1px solid rgba(0, 0, 0, 0.1);
      cursor: pointer;
    }
    .button:hover {
      background-color: rgba(0, 0, 0, 0.1);
    }

    .width-100-percent {
      width: 100%;
    }

    .menu {
      position: absolute;
      z-index: 2;
      top: 16px;
      left: 16px;
      user-select: none;
    }

    .menu button:hover {
      background-color: #dfdfdf;
    }

    .tools {
      user-select: none;
      gap: 8px;
      padding: 3px;
      border-radius: 8px;
      background-color: #fff;
      margin: auto;
      position: absolute;
      z-index: 1;
      top: 16px;
      left: 50%;
      transform: translateX(-50%);
      box-shadow: 0 0 8px rgba(0, 0, 0, 0.1);
      overflow-x: auto;
      white-space: nowrap;
      max-width: calc(100% - 128px);
      scrollbar-width: thin;
    }

    .tools button {
      background-color: transparent;
      color: #000;
      border: none;
      cursor: pointer;
      padding: 8px;
      border-radius: 4px;
      transition: background-color 0.2s;
    }

    .tools button:hover {
      background-color: rgba(0, 0, 0, 0.05);
    }

    .tools button:active,
    .tools .tools--active {
      background-color: rgba(0, 0, 0, 0.1);
    }

    .tools-options {
      user-select: none;
      position: absolute;
      z-index: 1;
      box-shadow: 0 0 8px rgba(0, 0, 0, 0.1);
      top: 84px;
      width: 200px;
      left: 16px;
      background-color: #fff;
      border-radius: 8px;
      padding: 8px 12px;
    }

    .footer-tools {
      position: absolute;
      z-index: 1;
      bottom: 0;
      left: 0;
      background-color: #f2f3f3;
      padding: 2px 8px;
      border-top-right-radius: 8px;
      box-shadow: 0 0 8px rgba(0, 0, 0, 0.1);
      display: flex;
      justify-content: space-between;
      flex-direction: row;
      align-items: center;
      gap: 8px;
      color: rgba(0, 0, 0, 0.5);
    }

    .footer-tools select {
      color: rgba(0, 0, 0, 0.5);
      padding: 4px;
    }

    @media (max-width: 450px) {
      .tools-options {
        width: calc(100% - 64px);
      }
    }

    .tools-options p {
      font-size: 14px;
      margin: 0;
    }

    canvas {
      top: 0;
      left: 0;
      position: absolute;
      right: 0;
      bottom: 0;
      width: 100%;
      height: 100%;
    }
  `;

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

    // Some workarounds to make sure everything is displayed on slow devices
    [20, 100, 200, 500, 1000, 2000].forEach((ms) => {
      setTimeout(() => {
        this.requestUpdate();
      }, ms);
    });
  }

  handleResize() {
    if (!this.canvas) {
      return;
    }

    this.canvas.width = this.canvas.clientWidth;
    this.canvas.height = this.canvas.clientHeight;

    this.draw();
  }

  coordsToCanvasCoords(x: number, y: number): Point {
    const dX = (this.canvas?.width || 0) / 2;
    const dY = (this.canvas?.height || 0) / 2;
    return {
      x: x * this.canvasCoords.zoom + this.canvasCoords.x + dX,
      y: y * this.canvasCoords.zoom + this.canvasCoords.y + dY,
    };
  }

  coordsFromCanvasCoords(x: number, y: number): Point {
    const dX = (this.canvas?.width || 0) / 2;
    const dY = (this.canvas?.height || 0) / 2;
    return {
      x: (x - this.canvasCoords.x - dX) / this.canvasCoords.zoom,
      y: (y - this.canvasCoords.y - dY) / this.canvasCoords.zoom,
    };
  }

  handleVisibilityChange() {
    if (!this.canvas) {
      return;
    }

    this.draw();
  }

  drawItem(
    rc: RoughCanvas,
    context: CanvasRenderingContext2D,
    item: WhiteboardItem
  ) {
    const tool = this.registeredTools.get(item.kind);
    if (tool) {
      tool.drawItem(rc, context, item);
      return;
    }
  }

  getBoundingRect(item: WhiteboardItem): BoundingRect | null {
    const tool = this.registeredTools.get(item.kind);
    if (!tool) {
      return null;
    }
    return tool.getBoundingRect(item);
  }

  drawItemBox(
    context: CanvasRenderingContext2D,
    item: WhiteboardItem,
    boxColor = "#135aa0"
  ): void {
    const boundingRect = this.getBoundingRect(item);
    if (!boundingRect) {
      return;
    }
    const { x, y, width, height } = boundingRect;
    const { x: coordX, y: coordY } = this.coordsToCanvasCoords(x, y);

    context.strokeStyle = boxColor;
    context.lineWidth = 2;
    context.beginPath();
    context.rect(
      coordX,
      coordY,
      width * this.canvasCoords.zoom,
      height * this.canvasCoords.zoom
    );
    context.stroke();
  }

  draw() {
    if (!this.canvas || !this.canvasContext) {
      return;
    }

    const context = this.canvasContext;
    context.clearRect(0, 0, this.canvas.width, this.canvas.height);

    const rc = rough.canvas(this.canvas, { options: { seed: 42 } });
    this.items.forEach((item) => this.drawItem(rc, context, item));
    if (this.currentDrawing) {
      this.drawItem(rc, context, this.currentDrawing);
    }

    const selectedItem = this.getSelectedItem();
    const hoveredItem = this.getHoveredItem();
    if (hoveredItem) {
      this.drawItemBox(context, hoveredItem, "#dbe6f0");
    }
    if (selectedItem) {
      this.drawItemBox(context, selectedItem);
    }
  }

  handleKeyDown(e: KeyboardEvent) {
    // If it is the backspace key, we remove the selected item
    if (e.key === "Backspace") {
      if (this.selectedItemId) {
        this.removeItemById(this.selectedItemId, true);
      }
    }
  }

  connectedCallback(): void {
    window.addEventListener("keydown", this.handleKeyDown.bind(this));
    window.addEventListener("resize", this.handleResize.bind(this));
    document.addEventListener(
      "visibilitychange",
      this.handleVisibilityChange.bind(this)
    );
    super.connectedCallback();
  }

  disconnectedCallback(): void {
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
  }

  handleDrawingMove(x: number, y: number) {
    const { x: mouseX, y: mouseY } = this.coordsFromCanvasCoords(x, y);
    this.mouseCoords = { x: mouseX, y: mouseY };
    const tool = this.registeredTools.get(this.currentTool);
    if (!tool) {
      return;
    }

    tool.handleDrawingMove(x, y);
  }

  handleDrawingEnd() {
    const tool = this.registeredTools.get(this.currentTool);
    if (!tool) {
      return;
    }
    tool.handleDrawingEnd();
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
      this.canvasCoords = {
        ...this.canvasCoords,
        x: this.canvasCoords.x + dx,
        y: this.canvasCoords.y + dy,
      };

      const distance = getTouchDistance(e.touches);
      const zoomFactor = distance / this.lastDistance;
      this.lastDistance = distance;

      const zoom = this.canvasCoords.zoom * zoomFactor;
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

  handleTouchEnd() {
    this.handleDrawingEnd();
  }

  handleTouchCancel() {
    if (!this.currentDrawing) {
      return;
    }

    this.currentDrawing = null;

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
  public registerTool(tool: SimpleWhiteboardTool): void {
    if (!tool || !tool.tagName || !tool.getToolName) {
      console.error("Invalid tool");
      return;
    }

    const toolName = tool.getToolName();
    this.registeredTools.set(toolName, tool);
    this.draw();
  }

  requestUpdate(
    name?: PropertyKey | undefined,
    oldValue?: unknown,
    options?: PropertyDeclaration<unknown, unknown> | undefined
  ): void {
    if (this.debug) {
      console.log("Request update", name, oldValue, options);
    }
    if (allLocales.includes(this.locale)) {
      setLocale(this.locale);
    }
    super.requestUpdate(name, oldValue, options);
  }

  resetWhiteboard() {
    this.items = [];
    this.selectedItemId = null;
  }

  public clearWhiteboard() {
    this.resetWhiteboard();
    this.canvasCoords = { x: 0, y: 0, zoom: 1 };
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

    const tool = this.registeredTools.get(this.currentTool);
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
      const icon = tool.getToolIcon();
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
    this.canvasCoords = {
      ...this.canvasCoords,
      zoom: Math.max(0.25, Math.min(4, zoom)),
    };
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
    const zoom = this.canvasCoords.zoom;
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
    return html`
      <div class="root">
        ${this.renderMenu()}

        <slot name="tools"></slot>

        ${this.renderToolsList()} ${this.renderToolsOptions()}
        ${this.renderFooterTools()}

        <canvas
          @mousedown="${this.handleMouseDown}"
          @mouseup="${this.handleMouseUp}"
          @mousemove="${this.handleMouseMove}"
          @touchstart="${this.handleTouchStart}"
          @touchmove="${this.handleTouchMove}"
          @touchend="${this.handleTouchEnd}"
          @touchcancel="${this.handleTouchCancel}"
        ></canvas>
      </div>
    `;
  }

  public getItems(): WhiteboardItem[] {
    return this.items;
  }

  public setItems(items: WhiteboardItem[]) {
    this.items = items;
    this.draw();
  }

  public addItem(item: WhiteboardItem, sendEvent: boolean = false) {
    this.items.push(item);
    this.draw();

    if (sendEvent) {
      const itemsUpdatedEvent = new CustomEvent("items-updated", {
        detail: {
          type: "add",
          item,
        },
      });
      this.dispatchEvent(itemsUpdatedEvent);
    }
  }

  public updateItem(itemId: string, item: WhiteboardItem) {
    const index = this.items.findIndex(
      (item: WhiteboardItem) => item.id === itemId
    );
    if (index === -1) {
      return;
    }

    this.items[index] = item;
    this.draw();
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
    if (updatePreviousTool) {
      this.previousTool = this.currentTool;
    }
    this.currentTool = tool;

    const toolInstance = this.registeredTools.get(tool);
    if (toolInstance) {
      toolInstance.onToolSelected();
    }
  }

  public setCurrentDrawing(item: WhiteboardItem | null) {
    this.currentDrawing = item;
    this.draw();
  }

  public getCurrentDrawing(): WhiteboardItem | null {
    return this.currentDrawing;
  }

  public getCanvasCoords() {
    return this.canvasCoords;
  }

  public setCanvasCoords(coords: { x: number; y: number; zoom: number }) {
    this.canvasCoords = coords;
    this.draw();
  }

  public setHoveredItemId(itemId: string | null) {
    this.hoveredItemId = itemId;
  }

  public getHoveredItemId(): string | null {
    return this.hoveredItemId;
  }

  public getHoveredItem(): WhiteboardItem | null {
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

  public getToolInstance(toolName: string): SimpleWhiteboardTool | undefined {
    return this.registeredTools.get(toolName);
  }

  public getItemById(itemId: string): WhiteboardItem | null {
    return this.items.find((item) => item.id === itemId) || null;
  }

  public getSelectedItem(): WhiteboardItem | null {
    if (!this.selectedItemId) {
      return null;
    }

    return this.getItemById(this.selectedItemId);
  }

  public updateItemById(
    itemId: string,
    item: WhiteboardItem,
    sendEvent = false
  ) {
    const index = this.items.findIndex(
      (item: WhiteboardItem) => item.id === itemId
    );
    if (index === -1) {
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
    const index = this.items.findIndex(
      (item: WhiteboardItem) => item.id === itemId
    );
    if (index === -1) {
      return;
    }

    this.items.splice(index, 1);
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
}
