import type { CanvasCoordinateProfileId } from "../../coordinateProfiles";
import type { ReferenceGridConfig } from "../../referenceGrid";

export type CanvasUnitName = "px" | "pt" | "mm" | "cm" | "in" | "cu";
export type CanvasUnitSystem = {
  unit: CanvasUnitName;
  label: string;
  unitsPerInch?: number;
  pixelsPerUnit: number;
  precision: number;
};
export type CanvasLayer = {
  id: string;
  name: string;
  visible: boolean;
  objectIds: string[];
};
export type CanvasLayerGroup = {
  id: string;
  title: string;
  description?: string;
  objectIds: string[];
  collapsed?: boolean;
};
export type CanvasFrame =
  | CanvasAbsoluteFrame
  | CanvasAnchorFrame
  | CanvasReferenceGridFrame
  | CanvasReferenceGridSpanFrame;
export type CanvasAbsoluteFrame = {
  kind: "absolute";
  x: number;
  y: number;
  width: number;
  height: number;
};
export type CanvasAnchorFrame = {
  kind: "anchor";
  left?: number;
  right?: number;
  top?: number;
  bottom?: number;
  width?: number;
  height?: number;
};
export type CanvasReferenceGridFrame = {
  kind: "referenceGrid";
  ref: string;
  anchor?: "topLeft" | "center" | "bottomRight";
  width: number;
  height: number;
};
export type CanvasReferenceGridSpanFrame = {
  kind: "referenceGridSpan";
  span: string;
};
export type CanvasObjectBase<TKind extends string = string> = {
  id: string;
  name: string;
  kind: TKind;
  layerId: string;
  visible: boolean;
  locked?: boolean;
  x: number;
  y: number;
  width: number;
  height: number;
  frame?: CanvasFrame;
  fill?: string;
  stroke?: string;
  tags?: string[];
  notes?: string;
};
export type CoreCanvasDocument<TObject extends CanvasObjectBase> = {
  id: string;
  name: string;
  width: number;
  height: number;
  unit: CanvasUnitName;
  unitSystem: CanvasUnitSystem;
  coordinateProfileId?: CanvasCoordinateProfileId;
  layers: CanvasLayer[];
  layerGroups?: CanvasLayerGroup[];
  objects: Record<string, TObject>;
  selectedObjectId?: string;
  referenceGrid?: ReferenceGridConfig;
};
export type RectObject = CanvasObjectBase<"rect"> & { radius?: number };
export type EllipseObject = CanvasObjectBase<"ellipse">;
export type PathObject = CanvasObjectBase<"path"> & {
  d: string;
  strokeWidth?: number;
  strokeDasharray?: string;
  fillRule?: "nonzero" | "evenodd";
};
export type TextObject = CanvasObjectBase<"text"> & {
  text: string;
  fontSize: number;
  fontWeight?: number | string;
};
export type CoreCanvasObject = RectObject | EllipseObject | PathObject | TextObject;
