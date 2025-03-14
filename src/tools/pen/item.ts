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
}
