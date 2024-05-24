import { LitElement, css, html } from "lit";
import rough from "roughjs";
import getStroke from "perfect-freehand";
import { customElement, state } from "lit/decorators.js";
import { RoughCanvas } from "roughjs/bin/canvas";
import { Options as RoughCanvasOptions } from "roughjs/bin/core";

/**
 * Calculate the average of two numbers.
 *
 * @param a The first number.
 * @param b The second number.
 * @returns The average of the two numbers.
 */
const average = (a: number, b: number) => (a + b) / 2;

/**
 * Get a SVG path from a stroke.
 *
 * @param points Coordinates of the points.
 * @param closed If the path should be closed.
 * @returns The SVG path.
 */
const getSvgPathFromStroke = (points: number[][], closed = true) => {
  const len = points.length;

  if (len < 4) {
    return ``;
  }

  let a = points[0];
  let b = points[1];
  const c = points[2];

  let result = `M${a[0].toFixed(2)},${a[1].toFixed(2)} Q${b[0].toFixed(
    2
  )},${b[1].toFixed(2)} ${average(b[0], c[0]).toFixed(2)},${average(
    b[1],
    c[1]
  ).toFixed(2)} T`;

  for (let i = 2, max = len - 1; i < max; i++) {
    a = points[i];
    b = points[i + 1];
    result += `${average(a[0], b[0]).toFixed(2)},${average(a[1], b[1]).toFixed(
      2
    )} `;
  }

  if (closed) {
    result += "Z";
  }

  return result;
};

type WhiteboardRect = {
  kind: "rect";
  x: number;
  y: number;
  width: number;
  height: number;
  options: RoughCanvasOptions;
};
type WhiteboardCircle = {
  kind: "circle";
  x: number;
  y: number;
  diameter: number;
  options: RoughCanvasOptions;
};
type WhiteboardLine = {
  kind: "line";
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  options: RoughCanvasOptions;
};
type WhiteboardPen = {
  kind: "pen";
  path: { x: number; y: number }[];
  options: {
    color?: string;
  };
};
type WhiteboardItem =
  | WhiteboardRect
  | WhiteboardCircle
  | WhiteboardLine
  | WhiteboardPen;

@customElement("simple-whiteboard")
export class Whiteboard extends LitElement {
  private canvas?: HTMLCanvasElement;

  @state() private items: WhiteboardItem[] = [];
  private currentDrawing: WhiteboardItem | undefined;
  private currentTool = "rect";

  static styles = css`
    #root {
      height: 100%;
      width: 100%;
      background-color: #fff;
      position: relative;
    }

    .tools {
      gap: 8px;
      padding: 8px;
      background-color: #f0f0f0;
      margin: auto;
      position: absolute;
      z-index: 1;
      top: 16px;
      left: 50%;
      transform: translateX(-50%);
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
        rc.rectangle(item.x, item.y, item.width, item.height, item.options);
        break;
      case "circle":
        rc.circle(item.x, item.y, item.diameter, item.options);
        break;
      case "line":
        rc.line(item.x1, item.y1, item.x2, item.y2, item.options);
        break;
      case "pen":
        const outlinePoints = getStroke(item.path, {
          size: 6,
          smoothing: 0.5,
          thinning: 0.5,
          streamline: 0.5,
        });
        const pathData = getSvgPathFromStroke(outlinePoints);

        const path = new Path2D(pathData);
        const prevFillStyle = context.fillStyle;
        context.fillStyle = item.options.color || "black";
        context.fill(path);
        context.fillStyle = prevFillStyle;
        break;
    }
  }

  draw() {
    if (!this.canvas) {
      return;
    }

    const context = this.canvas.getContext("2d") as CanvasRenderingContext2D;
    context.clearRect(0, 0, this.canvas.width, this.canvas.height);

    const rc = rough.canvas(this.canvas, { options: { seed: 42 } });
    this.items.forEach((item) => this.drawItem(rc, context, item));
    if (this.currentDrawing) {
      this.drawItem(rc, context, this.currentDrawing);
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

  handleMouseDown(e: MouseEvent) {
    this.currentDrawing = undefined;

    switch (this.currentTool) {
      case "rect":
        this.currentDrawing = {
          kind: "rect",
          x: e.offsetX,
          y: e.offsetY,
          width: 0,
          height: 0,
          options: {},
        };
        break;
      case "circle":
        this.currentDrawing = {
          kind: "circle",
          x: e.offsetX,
          y: e.offsetY,
          diameter: 0,
          options: {},
        };
        break;
      case "line":
        this.currentDrawing = {
          kind: "line",
          x1: e.offsetX,
          y1: e.offsetY,
          x2: e.offsetX,
          y2: e.offsetY,
          options: {},
        };
        break;
      case "pen":
        this.currentDrawing = {
          kind: "pen",
          path: [{ x: e.offsetX, y: e.offsetY }],
          options: {},
        };
        break;
    }
  }

  handleMouseMove(e: MouseEvent) {
    if (!this.currentDrawing) {
      return;
    }

    switch (this.currentDrawing.kind) {
      case "rect":
        const { x, y } = this.currentDrawing;
        this.currentDrawing.width = e.offsetX - x;
        this.currentDrawing.height = e.offsetY - y;
        break;
      case "circle":
        const { x: x1, y: y1 } = this.currentDrawing;
        const x2 = e.offsetX;
        const y2 = e.offsetY;
        const dx = x2 - x1;
        const dy = y2 - y1;
        this.currentDrawing.diameter = Math.sqrt(dx * dx + dy * dy) * 2;
        break;
      case "line":
        this.currentDrawing.x2 = e.offsetX;
        this.currentDrawing.y2 = e.offsetY;
        break;
      case "pen":
        this.currentDrawing.path.push({ x: e.offsetX, y: e.offsetY });
        break;
    }

    this.draw();
  }

  handleMouseUp() {
    if (!this.currentDrawing) {
      return;
    }

    this.items.push(this.currentDrawing);
    this.currentDrawing = undefined;

    this.draw();
  }

  render() {
    return html`
      <div id="root">
        <div class="tools">
          <button @click="${() => (this.currentTool = "rect")}">
            Rectangle
          </button>
          <button @click="${() => (this.currentTool = "circle")}">
            Circle
          </button>
          <button @click="${() => (this.currentTool = "line")}">Line</button>
          <button @click="${() => (this.currentTool = "pen")}">Pen</button>
        </div>

        <canvas
          @mousedown="${this.handleMouseDown}"
          @mouseup="${this.handleMouseUp}"
          @mousemove="${this.handleMouseMove}"
        ></canvas>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "simple-whiteboard": Whiteboard;
  }
}
