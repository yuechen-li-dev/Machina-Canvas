import type { CanvasObjectBase } from "../../core/document/model";

export type CanvasImageRole = "image" | "alphaMap" | "mask";
export type CanvasBlendMode = "normal" | "multiply" | "screen" | "overlay";
export type CanvasSketchRef =
  | { kind: "absolutePoint"; x: number; y: number }
  | {
      kind: "absoluteRect";
      x: number;
      y: number;
      width: number;
      height: number;
    }
  | { kind: "gridRef"; ref: string }
  | { kind: "gridSpan"; span: string }
  | {
      kind: "objectAnchor";
      objectId: string;
      anchor: "nw" | "n" | "ne" | "w" | "c" | "e" | "sw" | "s" | "se";
    };
export type CanvasSketchBox = {
  kind: "box";
  id: string;
  label?: string;
  ref: CanvasSketchRef;
  stroke?: string;
  fill?: string;
};
export type CanvasSketchLine = {
  kind: "line";
  id: string;
  label?: string;
  from: CanvasSketchRef;
  to: CanvasSketchRef;
  stroke?: string;
};
export type CanvasSketchPoint = {
  kind: "point";
  id: string;
  label?: string;
  ref: CanvasSketchRef;
  stroke?: string;
  fill?: string;
};
export type CanvasSketchLabel = {
  kind: "label";
  id: string;
  text: string;
  ref: CanvasSketchRef;
};
export type CanvasSketchPrimitive =
  | CanvasSketchBox
  | CanvasSketchLine
  | CanvasSketchPoint
  | CanvasSketchLabel;
export type CanvasSketchSpec = {
  id: string;
  name: string;
  dialect: "sketch";
  targetId?: string;
  primitives: readonly CanvasSketchPrimitive[];
};
export type ImageObject = CanvasObjectBase<"image"> & {
  src: string;
  role?: CanvasImageRole;
  alphaMapId?: string;
  sketchOverlayId?: string;
  spriteSidecarId?: string;
  intrinsicWidth?: number;
  intrinsicHeight?: number;
  opacity?: number;
  blendMode?: CanvasBlendMode;
  fit?: "fill" | "contain" | "cover";
};
export type SketchOverlayObject = CanvasObjectBase<"sketchOverlay"> & {
  role?: "sketch";
  targetId?: string;
  spec: CanvasSketchSpec;
};
export type ImageCanvasObject = ImageObject | SketchOverlayObject;
