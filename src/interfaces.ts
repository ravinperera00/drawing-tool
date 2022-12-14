import { Drawable } from "roughjs/bin/core";
import { Point } from "roughjs/bin/geometry";

export type TAction =
  | "drawing"
  | "moving"
  | "none"
  | "resizing"
  | "writing"
  | "erasing";

export interface IElement {
  id: string;
  x1: number;
  x2: number;
  y1: number;
  y2: number;
  elementComponent: Drawable | Path2D;
  path: Array<Point>;
  type: string;
  text: string;
}

export interface IDistanceArg {
  x: number;
  y: number;
}

export interface ISelectedElement {
  position: string | null;
  offsetX: number;
  offsetY: number;
  pathOffset: Array<Array<number>>;
}
