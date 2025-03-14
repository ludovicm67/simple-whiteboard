/**
 * A point in 2D space.
 */
export class Point {
  private x: number;
  private y: number;

  constructor(x: number, y: number) {
    this.x = x;
    this.y = y;
  }

  /**
   * Get the x-coordinate of the point.
   *
   * @returns The x-coordinate of the point.
   */
  public getX(): number {
    return this.x;
  }

  /**
   * Get the y-coordinate of the point.
   *
   * @returns The y-coordinate of the point.
   */
  public getY(): number {
    return this.y;
  }

  /**
   * Set the x-coordinate of the point.
   *
   * @param x The x-coordinate of the point.
   */
  public setX(x: number): void {
    this.x = x;
  }

  /**
   * Set the y-coordinate of the point.
   *
   * @param y The y-coordinate of the point.
   */
  public setY(y: number): void {
    this.y = y;
  }

  /**
   * Set the x and y coordinates of the point.
   *
   * @param x The x-coordinate of the point.
   * @param y The y-coordinate of the point.
   */
  public set(x: number, y: number): void {
    this.x = x;
    this.y = y;
  }

  /**
   * Clone the point.
   *
   * @returns The cloned point.
   */
  public clone(): Point {
    return new Point(this.x, this.y);
  }

  /**
   * Check if the point is equal to another point.
   *
   * @param point The point to compare.
   * @returns `true` if the points are equal, `false` otherwise.
   */
  public equals(point: Point): boolean {
    return this.x === point.x && this.y === point.y;
  }

  /**
   * Get the distance to another point.
   *
   * @param point The point to calculate the distance to.
   * @returns The distance to the other point.
   */
  public distanceTo(point: Point): number {
    return Math.sqrt(
      Math.pow(this.x - point.x, 2) + Math.pow(this.y - point.y, 2)
    );
  }

  /**
   * Translate the point by a vector.
   *
   * @param x The x-coordinate of the vector.
   * @param y The y-coordinate of the vector.
   */
  public translate(x: number, y: number): void {
    this.translateX(x);
    this.translateY(y);
  }

  /**
   * Translate the point by a vector.
   *
   * @param point The vector to translate the point by.
   */
  public translateX(x: number): void {
    this.x += x;
  }

  /**
   * Translate the point by a vector.
   *
   * @param point The vector to translate the point by.
   */
  public translateY(y: number): void {
    this.y += y;
  }
}
