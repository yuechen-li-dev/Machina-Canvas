import type { CoreCanvasDocument, CoreCanvasObject } from "./core/document/model";
import type { GuideCanvasObject } from "./modules/guides/model";
import type { ImageCanvasObject } from "./modules/images/model";
import type { MechanicalCanvasObject } from "./modules/mechanical/model";
import type { SpriteCanvasObject } from "./modules/sprites/model";
import type { StickerCanvasObject } from "./modules/stickers/model";
import type { WebUiCanvasObject } from "./modules/webUi/model";

export type CanvasObject =
  | CoreCanvasObject
  | ImageCanvasObject
  | SpriteCanvasObject
  | GuideCanvasObject
  | MechanicalCanvasObject
  | WebUiCanvasObject
  | StickerCanvasObject;

export type CanvasObjectKind = CanvasObject["kind"];
export type CanvasDocument = CoreCanvasDocument<CanvasObject>;

export type {
  CanvasAbsoluteFrame,
  CanvasAnchorFrame,
  CanvasFrame,
  CanvasLayer,
  CanvasLayerGroup,
  CanvasObjectBase,
  CanvasReferenceGridFrame,
  CanvasReferenceGridSpanFrame,
  CanvasUnitName,
  CanvasUnitSystem,
  CoreCanvasObject,
  EllipseObject,
  PathObject,
  RectObject,
  TextObject,
} from "./core/document/model";
export type {
  BlockoutSidecarObject,
  GuideCanvasObject,
  GuideSidecarObject,
} from "./modules/guides/model";
export type {
  CanvasBlendMode,
  CanvasImageRole,
  CanvasSketchBox,
  CanvasSketchLabel,
  CanvasSketchLine,
  CanvasSketchPoint,
  CanvasSketchPrimitive,
  CanvasSketchRef,
  CanvasSketchSpec,
  ImageCanvasObject,
  ImageObject,
  SketchOverlayObject,
} from "./modules/images/model";
export type {
  MechanicalAnnotationSidecarObject,
  MechanicalCanvasObject,
} from "./modules/mechanical/model";
export type {
  CanvasSpriteAnimation,
  CanvasSpriteDiagnostics,
  CanvasSpriteFrame,
  CanvasSpriteGridSpec,
  CanvasSpriteOverlaySettings,
  CanvasSpriteSpec,
  CanvasSpriteStackframe,
  CanvasSpriteSubgridRegion,
  SpriteCanvasObject,
  SpriteFrameSourceKind,
  SpriteOverlayDisplayMode,
  SpriteSidecarObject,
  SpriteStackframeDirection,
} from "./modules/sprites/model";
export type {
  StickerCanvasObject,
  StickerObject,
} from "./modules/stickers/model";
export type {
  CanvasUiPropValue,
  UiComponentObject,
  WebUiCanvasObject,
} from "./modules/webUi/model";
