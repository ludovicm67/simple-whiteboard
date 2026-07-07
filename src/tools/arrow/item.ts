import {
  ExportedWhiteboardItem,
  WhiteboardItem,
  WhiteboardItemType,
} from "../../lib/item";
import {
  DrawingContext,
  ResizeHandle,
  RoughCanvasOptions,
} from "../../lib/types";
import { distanceToSegment } from "../../lib/geometry";

export const ARROW_ITEM_TYPE = "arrow";

export const itemBuilder = (item: ArrowItemType, id?: string) =>
  new ArrowItem(item, id);

/**
 * Type for an arrow item.
 */
export interface ArrowItemType extends WhiteboardItemType {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  options: RoughCanvasOptions;
}

/**
 * Class for an arrow item: a line with an arrowhead at its end point.
 */
export class ArrowItem extends WhiteboardItem<ArrowItemType> {
  private x1: number;
  private y1: number;
  private x2: number;
  private y2: number;
  private options: RoughCanvasOptions;

  constructor(item: ArrowItemType, id?: string) {
    super(item, id);

    this.x1 = item.x1;
    this.y1 = item.y1;
    this.x2 = item.x2;
    this.y2 = item.y2;
    this.options = item.options;
  }

  /**
   * Get the type of the item.
   *
   * @returns The type of the item.
   */
  public override getType(): string {
    return ARROW_ITEM_TYPE;
  }

  /**
   * Export the arrow item to a JSON object.
   *
   * @returns The exported arrow item.
   */
  public override export(): ExportedWhiteboardItem<ArrowItemType> {
    return {
      id: this.getId(),
      type: this.getType(),
      data: {
        x1: this.x1,
        y1: this.y1,
        x2: this.x2,
        y2: this.y2,
        options: this.options,
      },
    };
  }

  /**
   * Updates all properties of the item with the ones that are passed in.
   * This doesn't override other properties that are not passed in.
   *
   * @param item item with the properties to update.
   */
  public override partialUpdate(item: Partial<ArrowItemType>): void {
    this.x1 = item.x1 ?? this.x1;
    this.y1 = item.y1 ?? this.y1;
    this.x2 = item.x2 ?? this.x2;
    this.y2 = item.y2 ?? this.y2;
    this.options = item.options ?? this.options;
  }

  /**
   * Updates all properties of the item with the ones that are passed in.
   * This overrides all properties with the ones that are passed in.
   *
   * @param item item with all the properties.
   */
  public override update(item: ArrowItemType): void {
    this.x1 = item.x1;
    this.y1 = item.y1;
    this.x2 = item.x2;
    this.y2 = item.y2;
    this.options = item.options;
  }

  /**
   * Draw the arrow item: a straight shaft and an arrowhead at the end.
   *
   * @param context The context to draw on.
   */
  public override draw(context: DrawingContext): void {
    // Convert the coordinates to canvas coordinates
    const { x: x1, y: y1 } = context.coords.convertToCanvas(this.x1, this.y1);
    const { x: x2, y: y2 } = context.coords.convertToCanvas(this.x2, this.y2);

    // Handle zoom
    const zoom = context.coords.getZoom();
    const strokeWidth = this.options.strokeWidth ?? 1;
    const drawOptions: RoughCanvasOptions = {
      ...this.options,
      strokeWidth: strokeWidth * zoom,
    };

    // Draw the shaft.
    context.roughCanvas.line(x1, y1, x2, y2, drawOptions);

    // Draw the arrowhead at the end point, pointing along the shaft direction.
    const dx = x2 - x1;
    const dy = y2 - y1;
    const length = Math.hypot(dx, dy);
    if (length < 1) {
      // Too short to have a meaningful direction yet.
      return;
    }

    const angle = Math.atan2(dy, dx);
    // Head size grows a bit with the stroke width, and scales with zoom.
    const headLength = (12 + strokeWidth * 2) * zoom;
    const headAngle = Math.PI / 7;

    const leftX = x2 - headLength * Math.cos(angle - headAngle);
    const leftY = y2 - headLength * Math.sin(angle - headAngle);
    const rightX = x2 - headLength * Math.cos(angle + headAngle);
    const rightY = y2 - headLength * Math.sin(angle + headAngle);

    context.roughCanvas.line(x2, y2, leftX, leftY, drawOptions);
    context.roughCanvas.line(x2, y2, rightX, rightY, drawOptions);
  }

  /**
   * Get the item's options.
   */
  public getOptions(): RoughCanvasOptions {
    return this.options;
  }

  /**
   * Set the item's options.
   *
   * @param options The new options.
   */
  public setOptions(options: RoughCanvasOptions): void {
    this.options = options;
  }

  /**
   * Update the item's options.
   */
  public updateOptions(options: Partial<RoughCanvasOptions>): void {
    this.options = {
      ...this.options,
      ...options,
    };
  }

  /**
   * Get the bounding box of the item.
   */
  public override getBoundingBox(): {
    x: number;
    y: number;
    width: number;
    height: number;
  } | null {
    return {
      x: Math.min(this.x1, this.x2),
      y: Math.min(this.y1, this.y2),
      width: Math.abs(this.x2 - this.x1),
      height: Math.abs(this.y2 - this.y1),
    };
  }

  /**
   * An arrow is only "touched" when the eraser gets close to the shaft itself
   * (the arrowhead sits at the end point, which the segment already covers),
   * not merely to its bounding box.
   */
  public override isHitByEraser(
    x: number,
    y: number,
    radius: number
  ): boolean {
    const halfStroke = (this.options.strokeWidth ?? 1) / 2;
    const dist = distanceToSegment(
      { x, y },
      { x: this.x1, y: this.y1 },
      { x: this.x2, y: this.y2 }
    );
    return dist <= radius + halfStroke;
  }

  /**
   * Return the relative move operation of the item.
   * The operation is the partial update that needs to be done to move the item.
   *
   * @param dx The amount to move in the x direction.
   * @param dy The amount to move in the y direction.
   *
   * @returns the partial update to perform if the item can be moved, `null` otherwise.
   */
  public override relativeMoveOperation(
    dx: number,
    dy: number
  ): Partial<ArrowItemType> | null {
    return {
      x1: this.x1 + dx,
      y1: this.y1 + dy,
      x2: this.x2 + dx,
      y2: this.y2 + dy,
    };
  }

  /**
   * Could the item be resized?
   * This is used to determine if the item should be resizable.
   */
  public isResizable(): boolean {
    return true;
  }

  /**
   * Return the relative resize operation of the item.
   * The operation is the partial update that needs to be done to resize the item.
   *
   * @param dx The amount to move in the x direction.
   * @param dy The amount to move in the y direction.
   * @param name The resize handle name.
   *
   * @returns the partial update to perform if the item can be moved, `null` otherwise.
   */
  public override relativeResizeOperation(
    dx: number,
    dy: number,
    name: string
  ): Partial<ArrowItemType> | null {
    switch (name) {
      case "point-1":
        return {
          x1: this.x1 + dx,
          y1: this.y1 + dy,
        };
      case "point-2":
        return {
          x2: this.x2 + dx,
          y2: this.y2 + dy,
        };
      default:
        return null;
    }
  }

  public override getResizeHandles(): ResizeHandle[] {
    return [
      { x: this.x1, y: this.y1, name: "point-1" },
      { x: this.x2, y: this.y2, name: "point-2" },
    ];
  }
}
