import { LitElement, css, html } from "lit";
import rough from "roughjs";
import { customElement, state } from "lit/decorators.js";
import { RoughCanvas } from "roughjs/bin/canvas";

type WhiteboardRect = {
  kind: "rect";
  x: number;
  y: number;
  width: number;
  height: number;
  options: Record<string, any>;
};
type WhiteboardCircle = {
  kind: "circle";
  x: number;
  y: number;
  diameter: number;
  options: Record<string, any>;
};
type WhiteboardLine = {
  kind: "line";
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  options: Record<string, any>;
};
type WhiteboardItem = WhiteboardRect | WhiteboardCircle | WhiteboardLine;

@customElement("ludo-whiteboard")
export class Whiteboard extends LitElement {
  private canvas?: HTMLCanvasElement;

  @state() private items: WhiteboardItem[] = [
    {
      kind: "rect",
      x: 10,
      y: 10,
      width: 200,
      height: 200,
      options: {},
    },
    {
      kind: "circle",
      x: 150,
      y: 150,
      diameter: 80,
      options: { roughness: 2.8, stroke: "red" },
    },
    {
      kind: "line",
      x1: 300,
      y1: 20,
      x2: 400,
      y2: 80,
      options: { roughness: 0.5, stroke: "green" },
    },
  ];
  private currentDrawing: WhiteboardItem | undefined;
  private currentTool = "circle";

  static styles = css`
    #root {
      height: 100%;
      width: 100%;
      background-color: #fff;
    }

    canvas {
      height: 100%;
      width: 100%;
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

  drawItem(rc: RoughCanvas, item: WhiteboardItem) {
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
    }
  }

  draw() {
    if (!this.canvas) {
      return;
    }

    const context = this.canvas.getContext("2d") as CanvasRenderingContext2D;
    context.clearRect(0, 0, this.canvas.width, this.canvas.height);

    const rc = rough.canvas(this.canvas, { options: { seed: 42 } });
    this.items.forEach((item) => this.drawItem(rc, item));
    if (this.currentDrawing) {
      this.drawItem(rc, this.currentDrawing);
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
    "ludo-whiteboard": Whiteboard;
  }
}
