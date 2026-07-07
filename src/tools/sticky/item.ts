import {
  ExportedWhiteboardItem,
  WhiteboardItem,
  WhiteboardItemType,
} from "../../lib/item";
import { DrawingContext, ResizeHandle } from "../../lib/types";
import { SimpleWhiteboard } from "../../simple-whiteboard";
import { findParentWhiteboard } from "../../lib/dom";

export const STICKY_ITEM_TYPE = "sticky";

// Visual constants, expressed in world units (they are scaled by the zoom).
const PADDING = 12;
const CORNER_RADIUS = 6;
const LINE_HEIGHT_FACTOR = 1.3;

export const itemBuilder = (item: StickyItemType, id?: string) =>
  new StickyItem(item, id);

/**
 * Type for a sticky-note item.
 */
export interface StickyItemType extends WhiteboardItemType {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  content: string;
  backgroundColor: string;
  color: string;
  fontSize: number;
}

/**
 * Draw a rounded rectangle path on the given context.
 */
const roundedRectPath = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number
): void => {
  const r = Math.max(0, Math.min(radius, width / 2, height / 2));
  // `roundRect` is available in every evergreen browser; fall back just in case.
  if (typeof ctx.roundRect === "function") {
    ctx.beginPath();
    ctx.roundRect(x, y, width, height, r);
    return;
  }
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + width, y, x + width, y + height, r);
  ctx.arcTo(x + width, y + height, x, y + height, r);
  ctx.arcTo(x, y + height, x, y, r);
  ctx.arcTo(x, y, x + width, y, r);
  ctx.closePath();
};

/**
 * Split text into lines that fit within `maxWidth`, honoring explicit line
 * breaks and wrapping long words when needed.
 */
const wrapText = (
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number
): string[] => {
  const lines: string[] = [];
  for (const paragraph of text.split("\n")) {
    if (paragraph === "") {
      lines.push("");
      continue;
    }
    let line = "";
    for (const word of paragraph.split(" ")) {
      const candidate = line ? `${line} ${word}` : word;
      if (ctx.measureText(candidate).width <= maxWidth || !line) {
        line = candidate;
      } else {
        lines.push(line);
        line = word;
      }
    }
    lines.push(line);
  }
  return lines;
};

/**
 * Class for a sticky-note item: a colored, resizable box with editable text.
 */
export class StickyItem extends WhiteboardItem<StickyItemType> {
  private editing = false;

  private x1: number;
  private y1: number;
  private x2: number;
  private y2: number;
  private content: string;
  private backgroundColor: string;
  private color: string;
  private fontSize: number;

  private whiteboard: SimpleWhiteboard | null = null;
  private editElement: HTMLTextAreaElement | null = null;

  constructor(item: StickyItemType, id?: string) {
    super(item, id);

    this.x1 = item.x1;
    this.y1 = item.y1;
    this.x2 = item.x2;
    this.y2 = item.y2;
    this.content = item.content;
    this.backgroundColor = item.backgroundColor;
    this.color = item.color;
    this.fontSize = item.fontSize;
  }

  public override getType(): string {
    return STICKY_ITEM_TYPE;
  }

  public override export(): ExportedWhiteboardItem<StickyItemType> {
    return {
      id: this.getId(),
      type: this.getType(),
      data: {
        x1: this.x1,
        y1: this.y1,
        x2: this.x2,
        y2: this.y2,
        content: this.content,
        backgroundColor: this.backgroundColor,
        color: this.color,
        fontSize: this.fontSize,
      },
    };
  }

  public override partialUpdate(item: Partial<StickyItemType>): void {
    this.x1 = item.x1 ?? this.x1;
    this.y1 = item.y1 ?? this.y1;
    this.x2 = item.x2 ?? this.x2;
    this.y2 = item.y2 ?? this.y2;
    this.content = item.content ?? this.content;
    this.backgroundColor = item.backgroundColor ?? this.backgroundColor;
    this.color = item.color ?? this.color;
    this.fontSize = item.fontSize ?? this.fontSize;
  }

  public override update(item: StickyItemType): void {
    this.x1 = item.x1;
    this.y1 = item.y1;
    this.x2 = item.x2;
    this.y2 = item.y2;
    this.content = item.content;
    this.backgroundColor = item.backgroundColor;
    this.color = item.color;
    this.fontSize = item.fontSize;
  }

  /**
   * Draw the sticky note: the colored paper, its text, and (while editing) the
   * text-area overlay used for editing.
   */
  public override draw(context: DrawingContext): void {
    const ctx = context.canvas;
    const zoom = context.coords.getZoom();
    const box = this.getBoundingBox();
    const { x, y } = context.coords.convertToCanvas(box.x, box.y);
    const width = box.width * zoom;
    const height = box.height * zoom;

    // Make sure editing is turned off if the note is no longer selected.
    const parent = ctx.canvas.parentElement;
    if (this.whiteboard === null && parent) {
      this.whiteboard = findParentWhiteboard(parent);
    }
    if (this.whiteboard && this.whiteboard.getSelectedItemId() !== this.getId()) {
      this.setEditing(false);
    }

    // Draw the paper with a soft drop shadow.
    ctx.save();
    ctx.shadowColor = "rgba(15, 23, 42, 0.18)";
    ctx.shadowBlur = 12 * zoom;
    ctx.shadowOffsetY = 3 * zoom;
    ctx.fillStyle = this.backgroundColor;
    roundedRectPath(ctx, x, y, width, height, CORNER_RADIUS * zoom);
    ctx.fill();
    ctx.restore();

    // Draw the text (hidden while the editor overlay is shown).
    if (!this.editing) {
      const padding = PADDING * zoom;
      const fontSize = this.fontSize * zoom;
      const lineHeight = fontSize * LINE_HEIGHT_FACTOR;

      ctx.save();
      // Clip so text never spills outside the note.
      roundedRectPath(ctx, x, y, width, height, CORNER_RADIUS * zoom);
      ctx.clip();
      ctx.fillStyle = this.color;
      ctx.font = `${fontSize}px sans-serif`;
      ctx.textBaseline = "top";
      const lines = wrapText(ctx, this.content, width - 2 * padding);
      lines.forEach((line, i) => {
        ctx.fillText(line, x + padding, y + padding + i * lineHeight);
      });
      ctx.restore();
    }

    this.renderEditor(parent, x, y, width, height, zoom);
  }

  /**
   * Create/update/position the text-area overlay used to edit the note.
   */
  private renderEditor(
    parent: HTMLElement | null,
    x: number,
    y: number,
    width: number,
    height: number,
    zoom: number
  ): void {
    if (!parent) {
      return;
    }

    let textarea = this.editElement;
    if (!textarea) {
      textarea = document.createElement("textarea");
      parent.appendChild(textarea);
      this.editElement = textarea;

      const onInput = (event: Event) => {
        const target = event.target as HTMLTextAreaElement;
        this.content = target.value;
        this.whiteboard?.partialItemUpdateById(
          this.getId(),
          { content: this.content },
          true
        );
      };
      textarea.addEventListener("input", onInput);
    }

    const padding = PADDING * zoom;
    textarea.value = this.content;
    textarea.style.position = "absolute";
    textarea.style.left = `${x + padding}px`;
    textarea.style.top = `${y + padding}px`;
    textarea.style.width = `${Math.max(0, width - 2 * padding)}px`;
    textarea.style.height = `${Math.max(0, height - 2 * padding)}px`;
    textarea.style.boxSizing = "border-box";
    textarea.style.margin = "0";
    textarea.style.padding = "0";
    textarea.style.border = "none";
    textarea.style.outline = "none";
    textarea.style.resize = "none";
    textarea.style.overflow = "hidden";
    textarea.style.background = "transparent";
    textarea.style.whiteSpace = "pre-wrap";
    textarea.style.overflowWrap = "break-word";
    textarea.style.lineHeight = `${LINE_HEIGHT_FACTOR}`;
    textarea.style.fontSize = `${this.fontSize * zoom}px`;
    textarea.style.fontFamily = "sans-serif";
    textarea.style.color = this.color;

    if (this.editing) {
      textarea.style.display = "block";
      textarea.focus({ preventScroll: true });
    } else {
      textarea.style.display = "none";
    }
  }

  public getContent(): string {
    return this.content;
  }

  public getOptions(): {
    backgroundColor: string;
    color: string;
    fontSize: number;
  } {
    return {
      backgroundColor: this.backgroundColor,
      color: this.color,
      fontSize: this.fontSize,
    };
  }

  public override getBoundingBox(): {
    x: number;
    y: number;
    width: number;
    height: number;
  } {
    const minX = Math.min(this.x1, this.x2);
    const minY = Math.min(this.y1, this.y2);
    return {
      x: minX,
      y: minY,
      width: Math.abs(this.x2 - this.x1),
      height: Math.abs(this.y2 - this.y1),
    };
  }

  public override relativeMoveOperation(
    dx: number,
    dy: number
  ): Partial<StickyItemType> | null {
    return {
      x1: this.x1 + dx,
      y1: this.y1 + dy,
      x2: this.x2 + dx,
      y2: this.y2 + dy,
    };
  }

  public override isResizable(): boolean {
    return true;
  }

  public override relativeResizeOperation(
    dx: number,
    dy: number,
    name: string
  ): Partial<StickyItemType> | null {
    switch (name) {
      case "point-1":
        return { x1: this.x1 + dx, y1: this.y1 + dy };
      case "point-2":
        return { x2: this.x2 + dx, y2: this.y2 + dy };
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

  /**
   * A sticky note is not removed with Backspace: that key is used to edit its
   * text. Use the delete button in the tool options instead.
   */
  public override isRemovableWithBackspace(): boolean {
    return false;
  }

  /**
   * Toggle the editing state (shows/hides and focuses the text-area overlay).
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
