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

export const RECT_ITEM_TYPE = "rect";

export const itemBuilder = (item: RectItemType, id?: string) =>
  new RectItem(item, id);

/**
 * Type for a rect item.
 */
export interface RectItemType extends WhiteboardItemType {
  x: number;
  y: number;
  width: number;
  height: number;
  options: RoughCanvasOptions;
}

/**
 * Class for a rect item.
 */
export class RectItem extends WhiteboardItem<RectItemType> {
  private x: number;
  private y: number;
  private width: number;
  private height: number;
  private options: RoughCanvasOptions;

  constructor(item: RectItemType, id?: string) {
    super(item, id);

    this.x = item.x;
    this.y = item.y;
    this.width = item.width;
    this.height = item.height;
    this.options = item.options;
  }

  /**
   * Get the type of the item.
   *
   * @returns The type of the item.
   */
  public override getType(): string {
    return RECT_ITEM_TYPE;
  }

  /**
   * Export the rect item to a JSON object.
   *
   * @returns The exported rect item.
   */
  public override export(): ExportedWhiteboardItem<RectItemType> {
    return {
      id: this.getId(),
      type: this.getType(),
      data: {
        x: this.x,
        y: this.y,
        width: this.width,
        height: this.height,
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
  public override partialUpdate(item: Partial<RectItemType>): void {
    this.x = item.x ?? this.x;
    this.y = item.y ?? this.y;
    this.width = item.width ?? this.width;
    this.height = item.height ?? this.height;
    this.options = item.options ?? this.options;
  }

  /**
   * Updates all properties of the item with the ones that are passed in.
   * This overrides all properties with the ones that are passed in.
   *
   * @param item item with all the properties.
   */
  public override update(item: RectItemType): void {
    this.x = item.x;
    this.y = item.y;
    this.width = item.width;
    this.height = item.height;
    this.options = item.options;
  }

  /**
   * Draw the rect item.
   *
   * @param context The context to draw on.
   */
  public override draw(context: DrawingContext): void {
    // Convert the coordinates to canvas coordinates
    const { x, y } = context.coords.convertToCanvas(this.x, this.y);

    // Handle zoom
    const zoom = context.coords.getZoom();
    const optionsOverride: RoughCanvasOptions = {};
    if (this.options.strokeWidth) {
      optionsOverride.strokeWidth = this.options.strokeWidth * zoom;
    }

    // Draw the item on the canvas
    context.roughCanvas.rectangle(x, y, this.width * zoom, this.height * zoom, {
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
    const strokeWidth = this.options.strokeWidth ?? 1;
    const halfStrokeWidth = strokeWidth / 2;

    return {
      x: this.x - halfStrokeWidth,
      y: this.y - halfStrokeWidth,
      width: this.width + strokeWidth,
      height: this.height + strokeWidth,
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
  ): Partial<RectItemType> | null {
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
   * @param dy The amount to move in the y direction.
   * @param name The resize handle name.
   *
   * @returns the partial update to perform if the item can be moved, `null` otherwise.
   */
  public override relativeResizeOperation(
    dx: number,
    dy: number,
    name: string
  ): Partial<RectItemType> | null {
    switch (name) {
      case "top-left":
        return {
          x: this.x + dx,
          y: this.y + dy,
          width: this.width - dx,
          height: this.height - dy,
        };
      case "top-right":
        return {
          y: this.y + dy,
          width: this.width + dx,
          height: this.height - dy,
        };
      case "bottom-left":
        return {
          x: this.x + dx,
          width: this.width - dx,
          height: this.height + dy,
        };
      case "bottom-right":
        return {
          width: this.width + dx,
          height: this.height + dy,
        };
      default:
        return null;
    }
  }

  public override getResizeHandles(): ResizeHandle[] {
    const boundingBox = this.getBoundingBox();
    if (!boundingBox) {
      return [];
    }
    const { x, y, width, height } = boundingBox;
    return [
      { x, y, name: "top-left" },
      { x: x + width, y, name: "top-right" },
      { x, y: y + height, name: "bottom-left" },
      { x: x + width, y: y + height, name: "bottom-right" },
    ];
  }
}
