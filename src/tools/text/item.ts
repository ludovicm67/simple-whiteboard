import {
  ExportedWhiteboardItem,
  WhiteboardItem,
  WhiteboardItemType,
} from "../../lib/item";
import { DrawingContext } from "../../lib/types";

export const TEXT_ITEM_TYPE = "text";

export const itemBuilder = (item: TextItemType, id?: string) =>
  new TextItem(item, id);

/**
 * Type for text options.
 */
export type TextOptions = {
  fontSize: number;
  fontFamily: string;
  color: string;
};

/**
 * Type for a text item.
 */
export interface TextItemType extends WhiteboardItemType {
  x: number;
  y: number;
  content: string;
  options: TextOptions;
}

/**
 * Class for a text item.
 */
export class TextItem extends WhiteboardItem<TextItemType> {
  private x: number;
  private y: number;
  private content: string;
  private options: TextOptions;

  private ctx: OffscreenCanvasRenderingContext2D | null = new OffscreenCanvas(
    1,
    1
  ).getContext("2d")!;

  constructor(item: TextItemType, id?: string) {
    super(item, id);

    this.x = item.x;
    this.y = item.y;
    this.content = item.content;
    this.options = item.options;
  }

  /**
   * Get the type of the item.
   *
   * @returns The type of the item.
   */
  public override getType(): string {
    return TEXT_ITEM_TYPE;
  }

  /**
   * Export the text item to a JSON object.
   *
   * @returns The exported text item.
   */
  public override export(): ExportedWhiteboardItem<TextItemType> {
    return {
      id: this.getId(),
      type: this.getType(),
      data: {
        x: this.x,
        y: this.y,
        content: this.content,
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
  public override partialUpdate(item: Partial<TextItemType>): void {
    console.log(item);
    this.x = item.x ?? this.x;
    this.y = item.y ?? this.y;
    this.content = item.content ?? this.content;
    this.options = item.options ?? this.options;
  }

  /**
   * Updates all properties of the item with the ones that are passed in.
   * This overrides all properties with the ones that are passed in.
   *
   * @param item item with all the properties.
   */
  public override update(item: TextItemType): void {
    this.x = item.x;
    this.y = item.y;
    this.content = item.content;
    this.options = item.options;
  }

  /**
   * Draw the text item.
   *
   * @param context The context to draw on.
   */
  public override draw(context: DrawingContext): void {
    // Convert the coordinates to canvas coordinates
    const { x, y } = context.coords.convertToCanvas(this.x, this.y);

    // Handle zoom
    const zoom = context.coords.getZoom();
    const optionsOverride: Partial<TextOptions> = {};
    if (this.options.fontSize) {
      optionsOverride.fontSize = this.options.fontSize * zoom;
    }

    // Draw the item on the canvas
    context.canvas.font = `${this.options.fontSize * zoom}px ${
      this.options.fontFamily
    }`;
    context.canvas.fillStyle = this.options.color || "#000000";
    this.content.split("\n").forEach((line, i) => {
      context.canvas.fillText(
        line,
        x,
        y + (i + 1) * this.options.fontSize * zoom
      );
    });
  }

  /**
   * Get the item's options.
   */
  public getOptions(): TextOptions {
    return this.options;
  }

  /**
   * Set the item's options.
   *
   * @param options The new options.
   */
  public setOptions(options: TextOptions): void {
    this.options = options;
  }

  /**
   * Update the item's options.
   */
  public updateOptions(options: Partial<TextOptions>): void {
    this.options = {
      ...this.options,
      ...options,
    };
  }

  /**
   * Get text content.
   */
  public getContent(): string {
    return this.content;
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
    const splittedText = this.content.split("\n");
    const height = splittedText.length * this.options.fontSize;

    // If there is no context, return a rough estimate of width
    if (!this.ctx) {
      const textWidth = splittedText.reduce((maxWidth, line) => {
        const width = line.length || 0;
        return Math.max(maxWidth, width);
      }, 0);
      return {
        x: this.x - 10,
        y: this.y - 5,
        width: textWidth + 20,
        height: height + 20,
      };
    }

    const textWidth = splittedText.reduce((maxWidth, line) => {
      if (!this.ctx) {
        return maxWidth;
      }
      this.ctx.font = `${this.options.fontSize}px ${this.options.fontFamily}`;
      const width = this.ctx.measureText(line).width || 0;
      return Math.max(maxWidth, width);
    }, 0);

    return {
      x: this.x - 10,
      y: this.y - 5,
      width: textWidth + 20,
      height: height + 20,
    };
  }

  /**
   * Return the relative move operation of the item.
   * The operation is the partial update that needs to be done to move the item.
   *
   * @param dx The amount to move in the x ditextion.
   * @param dy The amount to move in the y ditextion.
   *
   * @returns the partial update to perform if the item can be moved, `null` otherwise.
   */
  public override relativeMoveOperation(
    dx: number,
    dy: number
  ): Partial<TextItemType> | null {
    return {
      x: this.x + dx,
      y: this.y + dy,
    };
  }
  /**
   * Could the item be removed using the backspace key?
   * Since it is not safe to remove the item with the backspace key, the item should return false.
   * As the user might want to delete the text content instead of the text item.
   */
  public isRemovableWithBackspace(): boolean {
    return false;
  }
}
