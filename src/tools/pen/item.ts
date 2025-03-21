import getStroke from "perfect-freehand";
import {
  ExportedWhiteboardItem,
  WhiteboardItem,
  WhiteboardItemType,
} from "../../lib/item";
import { DrawingContext } from "../../lib/types";
import { getSvgPathFromStroke } from "../../lib/svg";

export const PEN_ITEM_TYPE = "pen";

export const itemBuilder = (item: PenItemType, id?: string) =>
  new PenItem(item, id);

export interface PenItemOptions {
  color: string;
  size: number;
  smoothing?: number;
  thinning?: number;
  streamline?: number;
}

/**
 * Type for a pen item.
 */
export interface PenItemType extends WhiteboardItemType {
  path: { x: number; y: number }[];
  options: PenItemOptions;
}

/**
 * Class for a pen item.
 */
export class PenItem extends WhiteboardItem<PenItemType> {
  private path: { x: number; y: number }[];
  private options: PenItemOptions;

  constructor(item: PenItemType, id?: string) {
    super(item, id);

    this.path = item.path;
    this.options = item.options;
  }

  /**
   * Get the type of the item.
   *
   * @returns The type of the item.
   */
  public override getType(): string {
    return PEN_ITEM_TYPE;
  }

  /**
   * Export the pen item to a JSON object.
   *
   * @returns The exported pen item.
   */
  public override export(): ExportedWhiteboardItem<PenItemType> {
    return {
      id: this.getId(),
      type: this.getType(),
      data: {
        path: this.path,
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
  public override partialUpdate(item: Partial<PenItemType>): void {
    this.path = item.path ?? this.path;
    this.options = item.options ?? this.options;
  }

  /**
   * Updates all properties of the item with the ones that are passed in.
   * This overrides all properties with the ones that are passed in.
   *
   * @param item item with all the properties.
   */
  public override update(item: PenItemType): void {
    this.path = item.path;
    this.options = item.options;
  }

  /**
   * Draw the pen item.
   *
   * @param context The context to draw on.
   */
  public override draw(context: DrawingContext): void {
    // Convert the coordinates to canvas coordinates
    const path = this.path.map(({ x, y }) =>
      context.coords.convertToCanvas(x, y)
    );

    // Handle zoom
    const zoom = context.coords.getZoom();
    const optionsOverride: Partial<PenItemOptions> = {};
    if (this.options.size) {
      optionsOverride.size = this.options.size * zoom;
    }

    // Generate a path from the points
    const outlinePoints = getStroke(path, {
      ...this.options,
      ...optionsOverride,
    });
    const pathData = getSvgPathFromStroke(outlinePoints);
    const path2D = new Path2D(pathData);

    // Draw the path on the canvas
    const prevFillStyle = context.canvas.fillStyle;
    context.canvas.fillStyle = this.options.color;
    context.canvas.fill(path2D);
    context.canvas.fillStyle = prevFillStyle;
  }

  /**
   * Get the item's options.
   */
  public getOptions(): PenItemOptions {
    return this.options;
  }

  /**
   * Set the item's options.
   *
   * @param options The new options.
   */
  public setOptions(options: PenItemOptions): void {
    this.options = options;
  }

  /**
   * Update the item's options.
   */
  public updateOptions(options: Partial<PenItemOptions>): void {
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
    const strokeWidth = this.options.size ?? 1;
    const halfStrokeWidth = strokeWidth / 2;

    const xValues = this.path.map(({ x }) => x);
    const yValues = this.path.map(({ y }) => y);

    const minX = Math.min(...xValues) - halfStrokeWidth;
    const minY = Math.min(...yValues) - halfStrokeWidth;
    const maxX = Math.max(...xValues) + halfStrokeWidth;
    const maxY = Math.max(...yValues) + halfStrokeWidth;

    return {
      x: minX,
      y: minY,
      width: maxX - minX,
      height: maxY - minY,
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
  ): Partial<PenItemType> | null {
    return {
      path: this.path.map(({ x, y }) => ({
        x: x + dx,
        y: y + dy,
      })),
    };
  }
}
