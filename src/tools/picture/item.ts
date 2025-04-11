import {
  ExportedWhiteboardItem,
  WhiteboardItem,
  WhiteboardItemType,
} from "../../lib/item";
import { DrawingContext, ResizeHandle } from "../../lib/types";

export const PICTURE_ITEM_TYPE = "picture";

export const itemBuilder = (item: PictureItemType, id?: string) =>
  new PictureItem(item, id);

/**
 * Type for a picture item.
 */
export interface PictureItemType extends WhiteboardItemType {
  x1: number;
  x2: number;
  y1: number;
  y2: number;
  src: string | null;
}

/**
 * Class for a picture item.
 */
export class PictureItem extends WhiteboardItem<PictureItemType> {
  private cachedPicture: HTMLImageElement | null = null;

  private x1: number;
  private x2: number;
  private y1: number;
  private y2: number;
  private src: string | null;

  constructor(item: PictureItemType, id?: string) {
    super(item, id);

    this.cachedPicture = null;

    this.x1 = item.x1;
    this.x2 = item.x2;
    this.y1 = item.y1;
    this.y2 = item.y2;
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
        x1: this.x1,
        x2: this.x2,
        y1: this.y1,
        y2: this.y2,
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

    this.x1 = item.x1 ?? this.x1;
    this.x2 = item.x2 ?? this.x2;
    this.y1 = item.y1 ?? this.y1;
    this.y2 = item.y2 ?? this.y2;
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

    this.x1 = item.x1;
    this.x2 = item.x2;
    this.y1 = item.y1;
    this.y2 = item.y2;
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

    const { x1, y1, x2, y2 } = this;
    const minX = Math.min(x1, x2);
    const minY = Math.min(y1, y2);
    const width = Math.abs(x2 - x1);
    const height = Math.abs(y2 - y1);

    // Convert the coordinates to canvas coordinates
    const { x, y } = context.coords.convertToCanvas(minX, minY);
    const zoom = context.coords.getZoom();

    if (this.cachedPicture) {
      context.canvas.drawImage(
        this.cachedPicture,
        x,
        y,
        width * zoom,
        height * zoom
      );
    } else {
      const img = new Image();
      img.onload = () => {
        this.cachedPicture = img;
        context.canvas.drawImage(img, x, y, width * zoom, height * zoom);
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
    const { x1, y1, x2, y2 } = this;
    const minX = Math.min(x1, x2);
    const minY = Math.min(y1, y2);
    const width = Math.abs(x2 - x1);
    const height = Math.abs(y2 - y1);

    return {
      x: minX,
      y: minY,
      width,
      height,
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
      x1: this.x1 + dx,
      x2: this.x2 + dx,
      y1: this.y1 + dy,
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
  ): Partial<PictureItemType> | null {
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
