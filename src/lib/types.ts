import { RoughCanvas as LocalRoughCanvas } from "roughjs/bin/canvas";
import { Options as LocalRoughCanvasOptions } from "roughjs/bin/core";
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

export type Point = {
  x: number;
  y: number;
};

export type RoughCanvas = LocalRoughCanvas;
export type RoughCanvasOptions = LocalRoughCanvasOptions;

export type ResizeHandle = { name: string; x: number; y: number };
