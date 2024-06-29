import {
  LitElement,
  PropertyDeclaration,
  TemplateResult,
  css,
  html,
} from "lit";
import rough from "roughjs";
import { icons } from "feather-icons";
import getStroke from "perfect-freehand";
import { v4 as uuidv4 } from "uuid";
import { customElement, state } from "lit/decorators.js";
import { RoughCanvas } from "roughjs/bin/canvas";
import { Options as RoughCanvasOptions } from "roughjs/bin/core";
import { unsafeHTML } from "lit/directives/unsafe-html.js";
import { getSvgPathFromStroke } from "./lib/svg";
import SimpleWhiteboardTool from "./lib/SimpleWhiteboardTool";

type BoundingRect = {
  x: number;
  y: number;
  width: number;
  height: number;
};

type WhiteboardRect = {
  kind: "rect";
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  options: RoughCanvasOptions;
};
type WhiteboardCircle = {
  kind: "circle";
  id: string;
  x: number;
  y: number;
  diameter: number;
  options: RoughCanvasOptions;
};
type WhiteboardLine = {
  kind: "line";
  id: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  options: RoughCanvasOptions;
};
type WhiteboardPen = {
  kind: "pen";
  id: string;
  path: { x: number; y: number }[];
  options: {
    color?: string;
  };
};
type WhiteboardMove = {
  kind: "move";
  x: number;
  y: number;
};
type WhiteboardPointer = {
  kind: "pointer";
  x: number;
  y: number;
};
type WhiteboardItem =
  | WhiteboardRect
  | WhiteboardCircle
  | WhiteboardLine
  | WhiteboardPen
  | WhiteboardMove
  | WhiteboardPointer;
type WhiteboardDrawableItem = Exclude<
  WhiteboardItem,
  WhiteboardMove | WhiteboardPointer
>;

type Point = {
  x: number;
  y: number;
};

const svgOptions = { width: 16, height: 16 };

const svgs = {
  move: icons.move.toSvg(svgOptions),
  pointer: icons["mouse-pointer"].toSvg(svgOptions),
  rect: icons.square.toSvg(svgOptions),
  circle: icons.circle.toSvg(svgOptions),
  line: icons.minus.toSvg(svgOptions),
  pen: icons["edit-2"].toSvg(svgOptions),
  clear: icons["trash-2"].toSvg(svgOptions),
};

type CurrentToolOptions = {
  strokeColor: string;
  fillColor: string;
  fillStyle:
    | "solid"
    | "hachure"
    | "zigzag"
    | "cross-hatch"
    | "dots"
    | "dashed"
    | "zigzag-line";
  noFill: boolean;
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
  private currentDrawing: WhiteboardItem | undefined;
  @state() private currentTool = "none";
  @state() private selectedItemId?: string = undefined;
  @state() private currentToolOptions: CurrentToolOptions = {
    strokeColor: "#000000",
    fillColor: "#000000",
    fillStyle: "hachure",
    noFill: true,
  };

  private drawableItems = ["rect", "circle", "line", "pen"];

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
    switch (item.kind) {
      case "rect":
        const { x: rectX, y: rectY } = this.coordsToCanvasCoords(
          item.x,
          item.y
        );
        rc.rectangle(rectX, rectY, item.width, item.height, item.options);
        break;
      case "circle":
        const { x: circleX, y: circleY } = this.coordsToCanvasCoords(
          item.x,
          item.y
        );
        rc.circle(circleX, circleY, item.diameter, item.options);
        break;
      case "line":
        const { x: lineX1, y: lineY1 } = this.coordsToCanvasCoords(
          item.x1,
          item.y1
        );
        const { x: lineX2, y: lineY2 } = this.coordsToCanvasCoords(
          item.x2,
          item.y2
        );
        rc.line(lineX1, lineY1, lineX2, lineY2, item.options);
        break;
      case "pen":
        const outlinePoints = getStroke(
          item.path.map((p) => {
            const { x, y } = this.coordsToCanvasCoords(p.x, p.y);
            return { x, y };
          }),
          {
            size: 6,
            smoothing: 0.5,
            thinning: 0.5,
            streamline: 0.5,
          }
        );
        const pathData = getSvgPathFromStroke(outlinePoints);

        const path = new Path2D(pathData);
        const prevFillStyle = context.fillStyle;
        context.fillStyle = item.options.color || "black";
        context.fill(path);
        context.fillStyle = prevFillStyle;
        break;
    }
  }

  getBoundingRect(item: WhiteboardItem): BoundingRect {
    let x = 0;
    let y = 0;
    let width = 0;
    let height = 0;

    // Get the bounding box of the item
    switch (item.kind) {
      case "rect":
        x = item.x;
        y = item.y;
        width = item.width;
        height = item.height;
        break;
      case "circle":
        x = item.x - item.diameter / 2;
        y = item.y - item.diameter / 2;
        width = item.diameter;
        height = item.diameter;
        break;
      case "line":
        x = Math.min(item.x1, item.x2);
        y = Math.min(item.y1, item.y2);
        width = Math.abs(item.x2 - item.x1);
        height = Math.abs(item.y2 - item.y1);
        break;
      case "pen":
        const xValues = item.path.map((p) => p.x);
        const yValues = item.path.map((p) => p.y);
        x = Math.min(...xValues);
        y = Math.min(...yValues);
        width = Math.max(...xValues) - x;
        height = Math.max(...yValues) - y;
        break;
      default:
        return { x, y, width, height };
    }

    return { x, y, width, height };
  }

  drawItemBox(context: CanvasRenderingContext2D, item: WhiteboardItem) {
    const { x, y, width, height } = this.getBoundingRect(item);
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

    if (this.selectedItemId) {
      const drawableItems = this.items.filter((item) => {
        if (!item || !this.drawableItems.includes(item.kind)) {
          return false;
        }
        return true;
      }) as WhiteboardDrawableItem[];
      const selectedItem = drawableItems.find(
        (item) => item.id === this.selectedItemId
      );
      if (selectedItem) {
        this.drawItemBox(context, selectedItem);
      }
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
    this.currentDrawing = undefined;
    this.selectedItemId = undefined;

    const itemId = uuidv4();

    const strokeColor = this.currentToolOptions.strokeColor;
    let fillColor = this.currentToolOptions.fillColor;
    const fillStyle = this.currentToolOptions.fillStyle;
    const noFill = this.currentToolOptions.noFill;
    if (noFill) {
      fillColor = "transparent";
    }

    switch (this.currentTool) {
      case "rect":
        const { x: rectX, y: rectY } = this.coordsFromCanvasCoords(x, y);
        this.currentDrawing = {
          kind: "rect",
          id: itemId,
          x: rectX,
          y: rectY,
          width: 0,
          height: 0,
          options: {
            stroke: strokeColor,
            fill: fillColor,
            fillStyle,
          },
        };
        break;
      case "circle":
        const { x: circleX, y: circleY } = this.coordsFromCanvasCoords(x, y);
        this.currentDrawing = {
          kind: "circle",
          id: itemId,
          x: circleX,
          y: circleY,
          diameter: 0,
          options: {
            stroke: strokeColor,
            fill: fillColor,
            fillStyle,
          },
        };
        break;
      case "line":
        const { x: lineX, y: lineY } = this.coordsFromCanvasCoords(x, y);
        this.currentDrawing = {
          kind: "line",
          id: itemId,
          x1: lineX,
          y1: lineY,
          x2: lineX,
          y2: lineY,
          options: {
            stroke: strokeColor,
          },
        };
        break;
      case "pen":
        const { x: penX, y: penY } = this.coordsFromCanvasCoords(x, y);
        this.currentDrawing = {
          kind: "pen",
          id: itemId,
          path: [{ x: penX, y: penY }],
          options: {
            color: strokeColor,
          },
        };
        break;
      case "move":
        this.currentDrawing = {
          kind: "move",
          x: x,
          y: y,
        };
        break;
      case "pointer":
        const { x: pointerX, y: pointerY } = this.coordsFromCanvasCoords(x, y);
        this.currentDrawing = {
          kind: "pointer",
          x: pointerX,
          y: pointerY,
        };
        break;
    }
  }

  handleDrawingMove(x: number, y: number) {
    if (!this.currentDrawing) {
      return;
    }

    switch (this.currentDrawing.kind) {
      case "rect":
        const { x: currentX, y: currentY } = this.currentDrawing;
        this.currentDrawing.width = x - currentX - this.canvasCoords.x;
        this.currentDrawing.height = y - currentY - this.canvasCoords.y;
        break;
      case "circle":
        const { x: x1, y: y1 } = this.currentDrawing;
        const x2 = x - this.canvasCoords.x;
        const y2 = y - this.canvasCoords.y;
        const dx = x2 - x1;
        const dy = y2 - y1;
        this.currentDrawing.diameter = Math.sqrt(dx * dx + dy * dy) * 2;
        break;
      case "line":
        this.currentDrawing.x2 = x - this.canvasCoords.x;
        this.currentDrawing.y2 = y - this.canvasCoords.y;
        break;
      case "pen":
        this.currentDrawing.path.push({
          x: x - this.canvasCoords.x,
          y: y - this.canvasCoords.y,
        });
        break;
      case "move":
        const { x: startX, y: startY } = this.currentDrawing;
        const moveX = x - startX;
        const moveY = y - startY;

        this.canvasCoords.x += moveX;
        this.canvasCoords.y += moveY;

        this.currentDrawing.x = x;
        this.currentDrawing.y = y;

        break;
    }

    this.draw();
  }

  handleDrawingEnd() {
    if (!this.currentDrawing || !this.canvasContext) {
      return;
    }

    const kind = this.currentDrawing.kind;

    if (kind === "pointer") {
      const { x: pointerX, y: pointerY } = this.currentDrawing;
      // Get all items that are under the pointer
      const potentialItems = this.items.filter((item) => {
        if (!this.currentDrawing || !this.drawableItems.includes(item.kind)) {
          return false;
        }
        const { x, y, width, height } = this.getBoundingRect(item);
        return (
          pointerX > x &&
          pointerX < x + width &&
          pointerY > y &&
          pointerY < y + height
        );
      }) as WhiteboardDrawableItem[];
      if (potentialItems.length > 0) {
        this.selectedItemId = potentialItems[0].id;
      }
    }

    if (this.drawableItems.includes(kind)) {
      // Add the current drawing to the items list (at the start)
      this.items.unshift(this.currentDrawing);

      const itemsUpdatedEvent = new CustomEvent("items-updated", {
        detail: {
          type: "add",
          item: this.currentDrawing,
        },
      });
      this.dispatchEvent(itemsUpdatedEvent);
    }
    this.currentDrawing = undefined;

    this.draw();
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

    this.currentDrawing = undefined;

    this.draw();
  }

  handleToolChange(event: Event, tool: string) {
    event.stopPropagation();
    this.currentTool = tool;
    // this.toolsMenu?.querySelectorAll("button").forEach((button) => {
    //   button.classList.toggle("tools--active", button === event.currentTarget);
    // });
  }

  public registerTool(tool: SimpleWhiteboardTool) {
    if (!tool || !tool.tagName || !tool.getToolName) {
      console.error("Invalid tool");
      return;
    }

    const toolName = tool.getToolName();

    console.log("Registering tool", tool);
    console.log("Tool name", toolName);

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
    this.selectedItemId = undefined;
  }

  clearWhiteboard() {
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

  handleItemStrokeColorChange(itemId: string) {
    const item = this.items.find(
      (item: any) => item.id === itemId
    ) as WhiteboardDrawableItem;
    if (!item || !this.drawableItems.includes(item.kind)) {
      return (_event: Event) => {};
    }

    return (event: Event) => {
      const input = event.target as HTMLInputElement;
      if (item.kind === "pen") {
        item.options.color = input.value;
      } else {
        item.options.stroke = input.value;
      }

      this.draw();

      const itemsUpdatedEvent = new CustomEvent("items-updated", {
        detail: {
          type: "update",
          itemId,
          item: item,
        },
      });
      this.dispatchEvent(itemsUpdatedEvent);
    };
  }

  handleItemFillColorChange(itemId: string) {
    const item = this.items.find((item: any) => item.id === itemId) as any;
    if (
      !item ||
      !this.drawableItems.includes(item.kind) ||
      !item.options.fill
    ) {
      return (_event: Event) => {};
    }

    return (event: Event) => {
      const input = event.target as HTMLInputElement;
      const value = input.value;
      item.options.fillColor = value;

      this.draw();

      const itemsUpdatedEvent = new CustomEvent("items-updated", {
        detail: {
          type: "update",
          itemId,
          item: item,
        },
      });
      this.dispatchEvent(itemsUpdatedEvent);
    };
  }

  handleStrokeColorChange(event: Event) {
    const input = event.target as HTMLInputElement;
    this.currentToolOptions.strokeColor = input.value;
  }
  handleFillColorChange(event: Event) {
    const input = event.target as HTMLInputElement;
    const value = input.value;
    if (value === "checkbox") {
      this.currentToolOptions.noFill = input.checked;
    } else {
      this.currentToolOptions.fillColor = value;
    }
  }

  renderToolsOptions() {
    const options: TemplateResult[] = [];

    let tool = this.currentTool;
    const currentToolOptions = { ...this.currentToolOptions };
    let handleStrokeColorChange = this.handleStrokeColorChange;
    let handleFillColorChange = this.handleFillColorChange;

    let currentItem;

    if (this.selectedItemId) {
      currentItem = this.items.find((item) => {
        if (!this.drawableItems.includes(item.kind)) {
          return false;
        }
        const drawableItem = item as WhiteboardDrawableItem;
        return drawableItem.id === this.selectedItemId;
      }) as WhiteboardDrawableItem;
    }
    if (currentItem) {
      tool = currentItem.kind || this.currentTool;
      if (currentItem.kind === "pen") {
        currentToolOptions.strokeColor = currentItem.options.color || "#000000";
      }
      if (currentItem.kind === "rect" || currentItem.kind === "circle") {
        currentToolOptions.fillColor = currentItem.options.fill || "#000000";
      }
      if (
        currentItem.kind === "rect" ||
        currentItem.kind === "circle" ||
        currentItem.kind === "line"
      ) {
        currentToolOptions.strokeColor =
          currentItem.options.stroke || "#000000";
      }
      handleStrokeColorChange = this.handleItemStrokeColorChange(
        currentItem.id
      );
      handleFillColorChange = this.handleItemFillColorChange(currentItem.id);
    }

    if (this.drawableItems.includes(tool)) {
      const colorOption = html`<p>Stroke color</p>
        <input
          type="color"
          .value=${currentToolOptions.strokeColor}
          @input=${handleStrokeColorChange}
        />`;
      options.push(colorOption);
    }

    if (tool === "rect" || tool === "circle") {
      const fillOption = html`<p>Fill color</p>
        <input
          type="color"
          .value=${currentToolOptions.fillColor}
          @input=${handleFillColorChange}
        />`;
      options.push(fillOption);
    }

    if (options.length === 0) {
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
        @click=${(e: Event) => this.handleToolChange(e, toolName)}
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

  public addItem(item: WhiteboardItem) {
    this.items.unshift(item);
    this.draw();
  }

  public updateItem(itemId: string, item: WhiteboardItem) {
    const index = this.items.findIndex((item: any) => item.id === itemId);
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
}
