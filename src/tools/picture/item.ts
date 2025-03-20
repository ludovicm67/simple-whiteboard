import {
  ExportedWhiteboardItem,
  WhiteboardItem,
  WhiteboardItemType,
} from "../../lib/item";
import { DrawingContext, RoughCanvasOptions } from "../../lib/types";

export const PICTURE_ITEM_TYPE = "picture";

export const itemBuilder = (item: PictureItemType, id?: string) =>
  new PictureItem(item, id);

/**
 * Type for a picture item.
 */
export interface PictureItemType extends WhiteboardItemType {
  x: number;
  y: number;
  width: number;
  height: number;
  src: string | null;
}

/**
 * Class for a picture item.
 */
export class PictureItem extends WhiteboardItem<PictureItemType> {
  private cachedPicture: HTMLImageElement | null = null;

  private x: number;
  private y: number;
  private width: number;
  private height: number;
  private src: string | null;

  constructor(item: PictureItemType, id?: string) {
    super(item, id);

    this.cachedPicture = null;

    this.x = item.x;
    this.y = item.y;
    this.width = item.width;
    this.height = item.height;
    this.src = item.src;
  }

  /**
   * Get the type of the item.
   *
   * @returns The type of the item.
   */
  public override getType(): string {
    return PICTURE_ITEM_TYPE;
  }

  /**
   * Export the picture item to a JSON object.
   *
   * @returns The exported picture item.
   */
  public override export(): ExportedWhiteboardItem<PictureItemType> {
    return {
      id: this.getId(),
      type: this.getType(),
      data: {
        x: this.x,
        y: this.y,
        width: this.width,
        height: this.height,
        src: this.src,
      },
    };
  }

  /**
   * Updates all properties of the item with the ones that are passed in.
   * This doesn't override other properties that are not passed in.
   *
   * @param item item with the properties to update.
   */
  public override partialUpdate(item: Partial<PictureItemType>): void {
    // Reset cached picture if the source changes
    if (item.src) {
      this.cachedPicture = null;
    }

    this.x = item.x ?? this.x;
    this.y = item.y ?? this.y;
    this.width = item.width ?? this.width;
    this.height = item.height ?? this.height;
    this.src = item.src ?? this.src;
  }

  /**
   * Updates all properties of the item with the ones that are passed in.
   * This overrides all properties with the ones that are passed in.
   *
   * @param item item with all the properties.
   */
  public override update(item: PictureItemType): void {
    // Reset cached picture
    this.cachedPicture = null;

    this.x = item.x;
    this.y = item.y;
    this.width = item.width;
    this.height = item.height;
    this.src = item.src;
  }

  /**
   * Draw the picture item.
   *
   * @param context The context to draw on.
   */
  public override draw(context: DrawingContext): void {
    // If there is no source, don't draw anything
    if (!this.src) {
      return;
    }

    // Convert the coordinates to canvas coordinates
    const { x, y } = context.coords.convertToCanvas(this.x, this.y);
    const zoom = context.coords.getZoom();

    if (this.cachedPicture) {
      context.canvas.drawImage(
        this.cachedPicture,
        x,
        y,
        this.width * zoom,
        this.height * zoom
      );
    } else {
      const img = new Image();
      img.onload = () => {
        this.cachedPicture = img;
        context.canvas.drawImage(
          img,
          x,
          y,
          this.width * zoom,
          this.height * zoom
        );
      };
      img.src = this.src;
    }
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
      x: this.x,
      y: this.y,
      width: this.width,
      height: this.height,
    };
  }

  /**
   * Return the relative move operation of the item.
   * The operation is the partial update that needs to be done to move the item.
   *
   * @param dx The amount to move in the x dipictureion.
   * @param dy The amount to move in the y dipictureion.
   *
   * @returns the partial update to perform if the item can be moved, `null` otherwise.
   */
  public override relativeMoveOperation(
    dx: number,
    dy: number
  ): Partial<PictureItemType> | null {
    return {
      x: this.x + dx,
      y: this.y + dy,
    };
  }
}
