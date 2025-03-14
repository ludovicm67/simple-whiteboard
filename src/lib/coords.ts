import { Point } from "./point";

/**
 * Context for the coordinates of the whiteboard.
 */
export class CoordsContext {
  private x: number;
  private y: number;
  private zoom: number;

  // Offset for the canvas coordinates, used to have (0, 0) at the center of the canvas.
  private offsetX: number = 0;
  private offsetY: number = 0;

  constructor(x: number = 0, y: number = 0, zoom: number = 1) {
    this.x = x;
    this.y = y;
    this.zoom = zoom;
  }

  /**
   * Convert the point from the canvas coordinates to the coordinates of the whiteboard.
   *
   * @param point Point in the canvas coordinates.
   * @returns Point in the coordinates of the whiteboard.
   */
  public convertPointFromCanvas(point: Point): Point {
    const { x, y } = this.convertFromCanvas(point.getX(), point.getY());
    return new Point(x, y);
  }

  /**
   * Convert the point from the coordinates of the whiteboard to the canvas coordinates.
   *
   * @param point Point in the coordinates of the whiteboard.
   * @returns Point in the canvas coordinates.
   */
  public convertPointToCanvas(point: Point): Point {
    const { x, y } = this.convertToCanvas(point.getX(), point.getY());
    return new Point(x, y);
  }

  /**
   * Convert the point from the canvas coordinates to the coordinates of the whiteboard.
   *
   * @param x X-coordinate in the canvas coordinates.
   * @param y Y-coordinate in the canvas coordinates.
   * @returns Point in the coordinates of the whiteboard.
   */
  public convertFromCanvas(x: number, y: number): { x: number; y: number } {
    return {
      x: (x - this.x - this.offsetX) / this.zoom,
      y: (y - this.y - this.offsetY) / this.zoom,
    };
  }

  /**
   * Convert the point from the coordinates of the whiteboard to the canvas coordinates.
   *
   * @param x X-coordinate in the coordinates of the whiteboard.
   * @param y Y-coordinate in the coordinates of the whiteboard.
   * @returns Point in the canvas coordinates.
   */
  public convertToCanvas(x: number, y: number): { x: number; y: number } {
    return {
      x: x * this.zoom + this.x + this.offsetX,
      y: y * this.zoom + this.y + this.offsetY,
    };
  }

  /**
   * Set the offset for the canvas coordinates.
   *
   * @param offsetX The offset for the x-coordinate.
   * @param offsetY The offset for the y-coordinate.
   */
  public setOffset(offsetX: number, offsetY: number): void {
    this.offsetX = offsetX;
    this.offsetY = offsetY;
  }

  /**
   * Set the zoom level.
   *
   * @param zoom The zoom level.
   */
  public setZoom(zoom: number): void {
    this.zoom = zoom;
  }

  /**
   * Get the zoom level.
   *
   * @returns The zoom level.
   */
  public getZoom(): number {
    return this.zoom;
  }

  /**
   * Get the coordinates of the whiteboard.
   */
  public getCoords(): { x: number; y: number } {
    return { x: this.x, y: this.y };
  }
}
