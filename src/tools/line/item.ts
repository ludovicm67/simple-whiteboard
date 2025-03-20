import {
  ExportedWhiteboardItem,
  WhiteboardItem,
  WhiteboardItemType,
} from "../../lib/item";
import { RoughCanvasOptions } from "../../lib/SimpleWhiteboardTool";
import { DrawingContext } from "../../lib/types";

export const LINE_ITEM_TYPE = "line";

export const itemBuilder = (item: LineItemType, id?: string) =>
  new LineItem(item, id);

/**
 * Type for a line item.
 */
export interface LineItemType extends WhiteboardItemType {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  options: RoughCanvasOptions;
}

/**
 * Class for a line item.
 */
export class LineItem extends WhiteboardItem<LineItemType> {
  private x1: number;
  private y1: number;
  private x2: number;
  private y2: number;
  private options: RoughCanvasOptions;

  constructor(item: LineItemType, id?: string) {
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
    return LINE_ITEM_TYPE;
  }

  /**
   * Export the line item to a JSON object.
   *
   * @returns The exported line item.
   */
  public override export(): ExportedWhiteboardItem<LineItemType> {
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
  public override partialUpdate(item: Partial<LineItemType>): void {
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
  public override update(item: LineItemType): void {
    this.x1 = item.x1;
    this.y1 = item.y1;
    this.x2 = item.x2;
    this.y2 = item.y2;
    this.options = item.options;
  }

  /**
   * Draw the line item.
   *
   * @param context The context to draw on.
   */
  public override draw(context: DrawingContext): void {
    // Convert the coordinates to canvas coordinates
    const { x: x1, y: y1 } = context.coords.convertToCanvas(this.x1, this.y1);
    const { x: x2, y: y2 } = context.coords.convertToCanvas(this.x2, this.y2);

    // Handle zoom
    const zoom = context.coords.getZoom();
    const optionsOverride: RoughCanvasOptions = {};
    if (this.options.strokeWidth) {
      optionsOverride.strokeWidth = this.options.strokeWidth * zoom;
    }

    // Draw the item on the canvas
    context.roughCanvas.line(x1, y1, x2, y2, {
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
