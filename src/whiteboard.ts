import { LitElement, css, html } from "lit";
import rough from "roughjs";
import { customElement } from "lit/decorators.js";

@customElement("ludo-whiteboard")
export class Whiteboard extends LitElement {
  private canvas?: HTMLCanvasElement;

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

  draw() {
    if (!this.canvas) {
      return;
    }

    const rc = rough.canvas(this.canvas, { options: { seed: 42 } });
    rc.rectangle(10, 10, 200, 200);
    rc.circle(150, 150, 80, { roughness: 2.8, stroke: "red" });
    rc.line(300, 20, 400, 80, { roughness: 0.5, stroke: "green" });
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

  render() {
    return html`
      <div id="root">
        <canvas></canvas>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ludo-whiteboard": Whiteboard;
  }
}
