import {
  ExportedWhiteboardItem,
  WhiteboardItem,
  WhiteboardItemType,
} from "../../lib/item";
import { RoughCanvasOptions } from "../../lib/SimpleWhiteboardTool";
import { DrawingContext } from "../../lib/types";

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
    if (this.options.strokeWidth) {
      optionsOverride.strokeWidth = this.options.strokeWidth * zoom;
    }

    // Draw the item on the canvas
    context.roughCanvas.circle(x, y, this.diameter * zoom, {
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
}
