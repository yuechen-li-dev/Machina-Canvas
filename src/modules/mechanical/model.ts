import type { CanvasObjectBase } from "../../core/document/model";
import type { MechanicalAnnotationSet } from "../../mechanicalAnnotations";

export type MechanicalAnnotationSidecarObject = CanvasObjectBase<"mechanicalAnnotationSidecar"> & {
  role?: "mechanicalAnnotationSidecar";
  targetObjectId?: string;
  annotations: MechanicalAnnotationSet;
};
export type MechanicalCanvasObject = MechanicalAnnotationSidecarObject;
