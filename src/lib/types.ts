import { RoughCanvas } from "roughjs/bin/canvas";
import { CoordsContext } from "./coords";

/**
 * Interface for the drawing context.
 */
export interface DrawingContext {
  canvas: CanvasRenderingContext2D;
  roughCanvas: RoughCanvas;
  coords: CoordsContext;
}

/**
 * Bounding rectangle.
 */
export interface BoundingRect {
  x: number;
  y: number;
  width: number;
  height: number;
}
