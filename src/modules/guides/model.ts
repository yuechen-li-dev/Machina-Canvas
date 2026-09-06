import type { CanvasBlockoutSidecar } from "../../blockoutSidecar";
import type { CanvasObjectBase } from "../../core/document/model";
import type { CanvasGuideSidecar } from "../../guideSidecar";

export type GuideSidecarObject = CanvasObjectBase<"guideSidecar"> & {
  role?: "guideSidecar";
  targetId?: string;
  opacity?: number;
  showLabels?: boolean;
  guide: CanvasGuideSidecar;
};
export type BlockoutSidecarObject = CanvasObjectBase<"blockoutSidecar"> & {
  role?: "blockoutSidecar";
  targetObjectId?: string;
  opacity?: number;
  showLabels?: boolean;
  blockout: CanvasBlockoutSidecar;
};
export type GuideCanvasObject = GuideSidecarObject | BlockoutSidecarObject;
