import {
  ExportedWhiteboardItem,
  WhiteboardItem,
  WhiteboardItemType,
} from "../../lib/item";
import { DrawingContext } from "../../lib/types";
import { SimpleWhiteboard } from "../../simple-whiteboard";
import { findParentWhiteboard } from "../../lib/dom";

export const TEXT_ITEM_TYPE = "text";

const TEXTAREA_EDIT_ID = "simple-whiteboard-text-tool-edit-zone";

/** Horizontal padding kept around the measured text, in world units. */
const PADDING_X = 10;

/** Vertical padding kept around the measured text, in world units. */
const PADDING_Y = 5;

/**
 * Ratios used to approximate the text extents when no real font metrics are
 * available (no measuring context, or a browser not reporting glyph bounds).
 * They are also used as a floor, so the box never gets tighter than the em box
 * of the font, even for content without any ascender/descender.
 */
const FALLBACK_CHAR_WIDTH_RATIO = 0.6;
const FALLBACK_ASCENT_RATIO = 1;
const FALLBACK_DESCENT_RATIO = 0.25;

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
  private editing: boolean = false;

  private x: number;
  private y: number;
  private content: string;
  private options: TextOptions;

  private whiteboard: SimpleWhiteboard | null = null;

  private editElement: HTMLTextAreaElement | null = null;

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
    const parentOfCanvasElement = context.canvas.canvas.parentElement;
    const whiteboard =
      this.whiteboard === null
        ? parentOfCanvasElement
          ? findParentWhiteboard(parentOfCanvasElement)
          : null
        : this.whiteboard;

    const selectedItemId = whiteboard?.getSelectedItemId();
    if (selectedItemId !== this.getId()) {
      this.setEditing(false);
    }

    // Convert the coordinates to canvas coordinates
    const { x, y } = context.coords.convertToCanvas(this.x, this.y);

    // Handle zoom
    const zoom = context.coords.getZoom();
    const optionsOverride: Partial<TextOptions> = {};
    if (this.options.fontSize) {
      optionsOverride.fontSize = this.options.fontSize * zoom;
    }

    // Draw the item on the canvas
    if (!this.editing) {
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

    if (parentOfCanvasElement) {
      // Check if there is an existing textarea an create it if not
      let textareaElement = this.editElement;
      if (!textareaElement) {
        textareaElement = document.createElement("textarea");
        textareaElement.id = TEXTAREA_EDIT_ID;
        parentOfCanvasElement.appendChild(textareaElement);
        this.editElement = textareaElement;

        const resizeTextareaToFitText = () => {
          if (!textareaElement) {
            return;
          }
          const { width, height } = this.getBoundingBox() ?? {
            width: 0,
            height: 0,
          };
          textareaElement.style.width = `${width + 10}px`;
          textareaElement.style.height = `${height + 10}px`;
        };
        const inputAction = (event: Event) => {
          const target = event.target as HTMLTextAreaElement;
          this.content = target.value;

          // Propagate the change to the whiteboard
          whiteboard?.partialItemUpdateById(
            this.getId(),
            {
              content: this.content,
            },
            true
          );

          resizeTextareaToFitText();
        };
        textareaElement.addEventListener("input", inputAction);
        textareaElement.addEventListener("focus", inputAction);
        resizeTextareaToFitText();
      }
      textareaElement.value = this.getContent();
      textareaElement.style.position = "absolute";
      textareaElement.style.left = `${x}px`;
      textareaElement.style.top = `${y}px`;
      textareaElement.style.outline = "none";
      textareaElement.style.resize = "none";
      textareaElement.style.margin = "0";
      textareaElement.style.padding = "0";
      textareaElement.style.lineHeight = "1";
      textareaElement.style.fontSize = `${this.options.fontSize * zoom}px`;
      textareaElement.style.fontFamily = this.options.fontFamily;
      textareaElement.style.color = this.options.color;
      textareaElement.style.background = "transparent";
      textareaElement.style.border = "none";
      textareaElement.style.overflow = "hidden";

      // We are in editing mode, so we need to show the textarea
      if (this.editing) {
        textareaElement.style.display = "block";
        // Set focus on the textarea
        textareaElement.focus({ preventScroll: true });
      } else {
        textareaElement.style.display = "none";
      }
    }
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
   *
   * The lines are drawn on successive baselines, the first one at
   * `y + fontSize`. The box is therefore derived from the real glyph extents
   * around those baselines (when the browser reports them), so that tall
   * accents and descenders — which grow with the font size — stay inside it.
   */
  public override getBoundingBox(): {
    x: number;
    y: number;
    width: number;
    height: number;
  } | null {
    const lines = this.content.split("\n");
    const { fontSize, fontFamily } = this.options;
    const firstBaseline = this.y + fontSize;
    const lastBaseline = this.y + lines.length * fontSize;

    let textWidth = 0;
    let ascent = fontSize * FALLBACK_ASCENT_RATIO;
    let descent = fontSize * FALLBACK_DESCENT_RATIO;

    const ctx = this.ctx;
    if (ctx) {
      ctx.font = `${fontSize}px ${fontFamily}`;
      lines.forEach((line) => {
        const metrics = ctx.measureText(line);
        // `width` is the advance width: glyphs overflowing it (italics, script
        // fonts, …) are only covered by the actual ink bounds.
        textWidth = Math.max(
          textWidth,
          metrics.width || 0,
          metrics.actualBoundingBoxRight || 0
        );
        ascent = Math.max(ascent, metrics.actualBoundingBoxAscent || 0);
        descent = Math.max(descent, metrics.actualBoundingBoxDescent || 0);
      });
    } else {
      textWidth = lines.reduce(
        (maxWidth, line) =>
          Math.max(maxWidth, line.length * fontSize * FALLBACK_CHAR_WIDTH_RATIO),
        0
      );
    }

    const top = firstBaseline - ascent - PADDING_Y;
    const bottom = lastBaseline + descent + PADDING_Y;

    return {
      x: this.x - PADDING_X,
      y: top,
      width: textWidth + PADDING_X * 2,
      height: bottom - top,
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

  /**
   * Set the editing state of the item.
   *
   * @param editing The new editing state.
   */
  public setEditing(editing: boolean): void {
    this.editing = editing;
    if (this.editElement) {
      this.editElement.style.display = editing ? "block" : "none";
      if (editing) {
        this.editElement.focus({ preventScroll: true });
      }
    }
  }

  public override onRemove(): void {
    if (this.editElement) {
      this.editElement.remove();
      this.editElement = null;
    }
  }
}
