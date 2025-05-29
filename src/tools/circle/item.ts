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

export const CIRCLE_ITEM_TYPE = "circle";

export const itemBuilder = (item: CircleItemType, id?: string) =>
  new CircleItem(item, id);

/**
 * Type for a circle item.
 */
export interface CircleItemType extends WhiteboardItemType {
  x: number;
  y: number;
  diameter: number;
  options: RoughCanvasOptions;
}

/**
 * Class for a circle item.
 */
export class CircleItem extends WhiteboardItem<CircleItemType> {
  private x: number;
  private y: number;
  private diameter: number;
  private options: RoughCanvasOptions;

  constructor(item: CircleItemType, id?: string) {
    super(item, id);

    this.x = item.x;
    this.y = item.y;
    this.diameter = item.diameter;
    this.options = item.options;
  }

  /**
   * Get the type of the item.
   *
   * @returns The type of the item.
   */
  public override getType(): string {
    return CIRCLE_ITEM_TYPE;
  }

  /**
   * Export the circle item to a JSON object.
   *
   * @returns The exported circle item.
   */
  public override export(): ExportedWhiteboardItem<CircleItemType> {
    return {
      id: this.getId(),
      type: this.getType(),
      data: {
        x: this.x,
        y: this.y,
        diameter: this.diameter,
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
  public override partialUpdate(item: Partial<CircleItemType>): void {
    this.x = item.x ?? this.x;
    this.y = item.y ?? this.y;
    this.diameter = item.diameter ?? this.diameter;
    this.options = item.options ?? this.options;
  }

  /**
   * Updates all properties of the item with the ones that are passed in.
   * This overrides all properties with the ones that are passed in.
   *
   * @param item item with all the properties.
   */
  public override update(item: CircleItemType): void {
    this.x = item.x;
    this.y = item.y;
    this.diameter = item.diameter;
    this.options = item.options;
  }

  /**
   * Draw the circle item.
   *
   * @param context The context to draw on.
   */
  public override draw(context: DrawingContext): void {
    // Convert the coordinates to canvas coordinates
    const { x, y } = context.coords.convertToCanvas(this.x, this.y);

    // Handle zoom
    const zoom = context.coords.getZoom();
    const optionsOverride: RoughCanvasOptions = {};
    let strokeWidth = 0;
    if (this.options.strokeWidth) {
      strokeWidth = this.options.strokeWidth;
      optionsOverride.strokeWidth = strokeWidth * zoom;
    }

    // Draw the item on the canvas
    context.roughCanvas.circle(x, y, (this.diameter - strokeWidth) * zoom, {
      ...this.options,
      ...optionsOverride,
    });
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
    const diameter = this.diameter;
    const radius = diameter / 2;

    return {
      x: this.x - radius,
      y: this.y - radius,
      width: diameter,
      height: diameter,
    };
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
  ): Partial<CircleItemType> | null {
    return {
      x: this.x + dx,
      y: this.y + dy,
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
   * @param _dy The amount to move in the y direction.
   * @param name The resize handle name.
   *
   * @returns the partial update to perform if the item can be moved, `null` otherwise.
   */
  public override relativeResizeOperation(
    dx: number,
    _dy: number,
    name: string
  ): Partial<CircleItemType> | null {
    switch (name) {
      case "diameter":
        const diameter = this.diameter + dx * 2;
        if (diameter < 0) {
          return {
            diameter: Math.abs(diameter),
            x: this.x + dx,
          };
        }
        return {
          diameter: diameter,
        };
      default:
        return null;
    }
  }

  public override getResizeHandles(): ResizeHandle[] {
    return [{ x: this.x + this.diameter / 2, y: this.y, name: "diameter" }];
  }
}
