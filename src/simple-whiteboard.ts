import {
  LitElement,
  PropertyDeclaration,
  TemplateResult,
  css,
  html,
} from "lit";
import rough from "roughjs";
import { customElement, state } from "lit/decorators.js";
import { RoughCanvas } from "roughjs/bin/canvas";
import SimpleWhiteboardTool, {
  WhiteboardItem,
  BoundingRect,
} from "./lib/SimpleWhiteboardTool";

type Point = {
  x: number;
  y: number;
};

@customElement("simple-whiteboard")
export class SimpleWhiteboard extends LitElement {
  private canvas?: HTMLCanvasElement;
  private canvasContext?: CanvasRenderingContext2D;

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

  static styles = css`
    .root {
      height: 100%;
      width: 100%;
      background-color: #fcfcff;
      position: relative;
    }

    .tools {
      user-select: none;
      gap: 8px;
      padding: 8px;
      border-radius: 8px;
      background-color: #fff;
      margin: auto;
      position: absolute;
      z-index: 1;
      top: 16px;
      left: 50%;
      transform: translateX(-50%);
      box-shadow: 0 0 8px rgba(0, 0, 0, 0.1);
    }

    .tools button {
      background-color: transparent;
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
    return {
      x: x + this.canvasCoords.x,
      y: y + this.canvasCoords.y,
    };
  }

  coordsFromCanvasCoords(x: number, y: number): Point {
    return {
      x: x - this.canvasCoords.x,
      y: y - this.canvasCoords.y,
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

  drawItemBox(context: CanvasRenderingContext2D, item: WhiteboardItem): void {
    const boundingRect = this.getBoundingRect(item);
    if (!boundingRect) {
      return;
    }
    const { x, y, width, height } = boundingRect;
    const { x: coordX, y: coordY } = this.coordsToCanvasCoords(x, y);

    context.strokeStyle = "#135aa0";
    context.lineWidth = 2;
    context.beginPath();
    context.rect(coordX, coordY, width, height);
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
    if (selectedItem) {
      this.drawItemBox(context, selectedItem);
    }
  }

  connectedCallback(): void {
    super.connectedCallback();
    window.addEventListener("resize", this.handleResize.bind(this));
    document.addEventListener(
      "visibilitychange",
      this.handleVisibilityChange.bind(this)
    );
  }

  disconnectedCallback(): void {
    document.removeEventListener(
      "visibilitychange",
      this.handleVisibilityChange.bind(this)
    );
    window.removeEventListener("resize", this.handleResize.bind(this));
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
    this.handleDrawingMove(e.offsetX, e.offsetY);
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
    this.requestUpdate();
  }

  requestUpdate(
    name?: PropertyKey | undefined,
    oldValue?: unknown,
    options?: PropertyDeclaration<unknown, unknown> | undefined
  ): void {
    console.log("Request update", name, oldValue, options);
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

  render() {
    return html`
      <div class="root">
        <slot name="tools"></slot>

        ${this.renderToolsList()} ${this.renderToolsOptions()}

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
    this.items.unshift(item);
    this.draw();

    if (sendEvent) {
      const itemsUpdatedEvent = new CustomEvent("items-updated", {
        detail: {
          type: "add",
          item: this.currentDrawing,
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

  public removeItemById(itemId: string, sendEvent = false) {
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
}
