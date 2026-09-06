import type { Rect } from "machinalayout";
import { enumTable, matchEnum } from "machinalayout/match";
import type { MachinaSlotProps } from "machinalayout/react";
import { useEffect, useState } from "react";
import type { CanvasTerminalLogEntry } from "../../canvasCommandsTerminal";
import type { CanvasExportBundle, CanvasExportFile } from "../../canvasExport";
import type { CanvasExportValidationResult } from "../../canvasExportValidation";
import { formatCanvasMeasurement, getCanvasUnitSystem } from "../../canvasUnits";
import type { CanvasAidToggles } from "../../canvasViewAids";
import type { CanvasViewport } from "../../canvasViewport";
import {
  type CanvasEditorModeTemplate,
  type CanvasToolGroupId,
  getCanvasEditorModeTemplate,
} from "../../editorModes";
import type {
  CanvasExportArtifact,
  CanvasExportCart,
  CanvasExportCheckoutResult,
  CanvasExportPreset,
} from "../../exportCart";
import type { RasterExportBackground } from "../../rasterExport";
import type {
  CanvasCommand,
  CanvasCommandApplyResult,
  CanvasCommandValidationResult,
} from "../../sceneCommands";
import type { GeometryDiagnostic } from "../../sceneGeometry";
import type {
  BlockoutSidecarObject,
  CanvasDocument,
  CanvasFrame,
  CanvasImageRole,
  CanvasObject,
  CanvasObjectKind,
  GuideSidecarObject,
  ImageObject,
  MechanicalAnnotationSidecarObject,
  SpriteSidecarObject,
} from "../../sceneModel";
import type { SpriteAuditReport, SpriteAuditScope } from "../../spriteAudit";
import type { SpriteFrameRect } from "../../spriteFrameEditor";
import type { CanvasToolResult } from "../../tools";

export const MIN_WIDTH = 760;

export const MIN_HEIGHT = 640;

export const INITIAL_MODE_TEMPLATE = getCanvasEditorModeTemplate("blank");

export const INITIAL_EDITOR_DOCUMENT = INITIAL_MODE_TEMPLATE.createScene();

export const objectKindLabels = enumTable<CanvasObjectKind, string>({
  rect: "Rectangle",
  ellipse: "Ellipse",
  path: "Path",
  text: "Text",
  image: "Image",
  uiComponent: "UI Component",
  sketchOverlay: "Sketch Overlay",
  spriteSidecar: "Sprite Sidecar",
  guideSidecar: "Guide Sidecar",
  blockoutSidecar: "Blockout Sidecar",
  mechanicalAnnotationSidecar: "Mechanical Annotations",
  sticker: "Sticker",
});

export const commandKindLabels = enumTable<CanvasCommand["kind"], string>({
  select: "Select",
  move: "Move",
  resize: "Resize",
  setFill: "Set fill",
  setStroke: "Set stroke",
  align: "Align",
  distribute: "Distribute",
  moveToGrid: "Move to grid",
  alignToGrid: "Align to grid",
  resizeToGridSpan: "Resize to grid span",
  setFrame: "Set frame",
  setUiProp: "Set UI prop",
  alignObjectByGuideMarks: "Align by guide mark",
  addImageObject: "Add image object",
  addSpriteSidecarObject: "Add sprite sidecar",
  addGuideSidecarObject: "Add guide sidecar",
  addBlockoutSidecarObject: "Add blockout sidecar",
  removeObject: "Remove object",
  attachAlphaMap: "Attach alpha map",
  detachAlphaMap: "Detach alpha map",
  attachSketchOverlay: "Attach sketch overlay",
  detachSketchOverlay: "Detach sketch overlay",
  setSketchOverlayVisible: "Set sketch overlay visible",
  attachGuideSidecar: "Attach guide sidecar",
  detachGuideSidecar: "Detach guide sidecar",
  setGuideSidecarVisible: "Set guide sidecar visible",
  setGuideSidecarOpacity: "Set guide sidecar opacity",
  setGuideSidecarShowLabels: "Set guide sidecar labels",
  attachBlockoutSidecar: "Attach blockout sidecar",
  detachBlockoutSidecar: "Detach blockout sidecar",
  setBlockoutSidecarVisible: "Set blockout sidecar visible",
  setBlockoutSidecarOpacity: "Set blockout sidecar opacity",
  attachSpriteSidecar: "Attach sprite sidecar",
  detachSpriteSidecar: "Detach sprite sidecar",
  setSpriteSidecarVisible: "Set sprite sidecar visible",
  setSpriteOverlayOption: "Set sprite overlay option",
  setSpriteOverlayDisplayMode: "Set sprite overlay mode",
  selectSpriteFrame: "Select sprite frame",
  updateSpriteFrameRect: "Set sprite frame rect",
  nudgeSpriteFrame: "Nudge sprite frame",
  resizeSpriteFrame: "Resize sprite frame",
  clampSpriteFrameToGuideRegion: "Clamp sprite frame to guide region",
  snapSpriteFrameToDatum: "Snap sprite frame to datum",
  snapSpriteFrameToNearestDatum: "Snap sprite frame to nearest datum",
  addSticker: "Add sticker",
  renameSticker: "Rename sticker",
});

export const exampleCommandJson = JSON.stringify(
  [
    {
      kind: "moveToGrid",
      id: "feature-chip-1",
      ref: "B4.c",
      anchor: "center",
    },
    {
      kind: "alignToGrid",
      ids: ["logo", "headline"],
      axis: "left",
      ref: "A1.w",
    },
    {
      kind: "attachAlphaMap",
      sourceId: "generated-product-image",
      alphaId: "generated-product-alpha",
    },
    {
      kind: "setSketchOverlayVisible",
      overlayId: "generated-product-sketch",
      visible: true,
    },
    {
      kind: "setFrame",
      id: "cta-bg",
      frame: {
        kind: "anchor",
        left: 72,
        top: 390,
        width: 188,
        height: 48,
      },
    },
  ],
  null,
  2,
);

export type CommandLogEntry = {
  id: string;
  timestamp: string;
  commands: CanvasCommand[];
  results: CanvasCommandApplyResult[];
};

export type SpriteFrameEditSettings = {
  snapToGrid: boolean;
  gridSize: number;
  constrainFrameEditsToGuideRegion: boolean;
  datumSnapDistance: number;
  restrictDatumSnapsToGuideRegion: boolean;
};

export type SpriteDragState = {
  sidecarId: string;
  frameId: string;
  imageId: string;
  mode: "move" | "resize";
  startPoint: { x: number; y: number };
  currentPoint: { x: number; y: number };
  startRect: SpriteFrameRect;
};

export type CanvasPanState = {
  startClientX: number;
  startClientY: number;
  startViewport: CanvasViewport;
};

export type InspectorGroupId =
  | "selected-object"
  | "selected-sprite-frame"
  | "geometry"
  | "viewport"
  | "alignment"
  | "sprite-sidecar"
  | "sprite-audit"
  | "ui-component"
  | "view-aids"
  | "image-assets"
  | "export"
  | "command-diagnostics"
  | "metadata";

export type AppViewData = {
  activeMode: CanvasEditorModeTemplate;
  document: CanvasDocument;
  viewport: CanvasViewport;
  aidToggles: CanvasAidToggles;
  lastCommand: string;
  commandJson: string;
  commandValidation: CanvasCommandValidationResult | undefined;
  commandLog: CommandLogEntry[];
  commandLogCollapsed: boolean;
  lastApplyResults: CanvasCommandApplyResult[];
  terminalLog: CanvasTerminalLogEntry[];
  terminalCollapsed: boolean;
  terminalInput: string;
  spriteFrameEditSettings: SpriteFrameEditSettings;
  lastToolResult: CanvasToolResult | undefined;
  geometryDiagnostics: GeometryDiagnostic[];
  exportArtifacts: readonly CanvasExportArtifact[];
  exportCart: CanvasExportCart;
  exportPresets: readonly CanvasExportPreset[];
  checkpointNote: string;
  lastCheckout: CanvasExportCheckoutResult | undefined;
  exportBundle: CanvasExportBundle | undefined;
  exportValidation: CanvasExportValidationResult | undefined;
  selectedExportPath: string | undefined;
  exportStatus: string;
  rasterScale: number;
  rasterBackground: RasterExportBackground;
  rasterArtifact: RasterExportArtifact | undefined;
  rasterStatus: string;
  isToolGroupVisible: (group: CanvasToolGroupId) => boolean;
  returnToModeSelection: () => void;
  setViewport: (viewport: CanvasViewport | ((current: CanvasViewport) => CanvasViewport)) => void;
  setAidToggle: (key: keyof CanvasAidToggles, value: boolean) => void;
  fitViewport: () => void;
  setZoom: (zoom: number) => void;
  zoomToSelected: () => void;
  zoomToGridRef: (ref: string) => void;
  zoomToGridSpan: (span: string) => void;
  runCommand: (command: CanvasCommand) => void;
  runCommands: (commands: CanvasCommand[]) => void;
  runTerminalCommand: (input: string) => void;
  setCommandLogCollapsed: (collapsed: boolean) => void;
  setTerminalCollapsed: (collapsed: boolean) => void;
  setSpriteFrameEditSettings: (settings: SpriteFrameEditSettings) => void;
  setTerminalInput: (input: string) => void;
  runCanvasTool: (
    toolId: string,
    input: { targetObjectId?: string; options?: Record<string, unknown> },
  ) => Promise<void>;
  createLayerGroup: (title: string) => void;
  loadImageFile: (
    file: File,
    options?: {
      role?: CanvasImageRole;
      groupId?: string;
      attachToImageId?: string;
    },
  ) => Promise<void>;
  loadSketchOverlayFile: (
    file: File,
    options?: { targetId?: string; groupId?: string },
  ) => Promise<void>;
  loadGuideSidecarFile: (
    file: File,
    options?: { targetId?: string; groupId?: string },
  ) => Promise<void>;
  loadBlockoutSidecarFile: (
    file: File,
    options?: { targetObjectId?: string; groupId?: string },
  ) => Promise<void>;
  createMechanicalAnnotationsSidecar: (options?: {
    targetObjectId?: string;
    groupId?: string;
  }) => Promise<void>;
  loadSpriteSidecarFile: (
    file: File,
    options?: { targetId?: string; groupId?: string },
  ) => Promise<void>;
  setCommandJson: (commandJson: string) => void;
  loadExampleCommands: () => void;
  validateCommandJson: () => void;
  applyCommandJson: () => void;
  generateExport: () => void;
  generateTsxExport: () => void;
  applyExportPreset: (presetId: string) => void;
  toggleExportArtifact: (artifactId: string) => void;
  checkoutExportCart: () => Promise<void>;
  saveCheckpoint: (message?: string) => Promise<void>;
  setCheckpointNote: (value: string) => void;
  setRasterScale: (scale: number) => void;
  setRasterBackground: (background: RasterExportBackground) => void;
  generatePngExport: () => Promise<void>;
  selectExportFile: (path: string) => void;
  copySelectedExportFile: () => void;
  copyValidationReport: () => void;
  downloadSelectedExportFile: () => void;
  downloadRasterArtifact: () => void;
};

export type RasterExportArtifact = {
  path: string;
  mimeType: string;
  blob: Blob;
  size: number;
};

export function getRootRect(): Rect {
  if (typeof window === "undefined") {
    return { x: 0, y: 0, width: 1440, height: 900 };
  }

  return {
    x: 0,
    y: 0,
    width: Math.max(MIN_WIDTH, window.innerWidth),
    height: Math.max(MIN_HEIGHT, window.innerHeight),
  };
}

export function useRootRect(): Rect {
  const [rect, setRect] = useState(getRootRect);

  useEffect(() => {
    const update = () => setRect(getRootRect());
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  return rect;
}

export function readViewData(props: MachinaSlotProps): AppViewData {
  return props.viewData as AppViewData;
}

export function getSelectedObject(document: CanvasDocument): CanvasObject | undefined {
  return document.selectedObjectId ? document.objects[document.selectedObjectId] : undefined;
}

export function getOwnerImageForSelection(
  document: CanvasDocument,
  object: CanvasObject | undefined,
): ImageObject | undefined {
  if (!object) return undefined;
  if (object.kind === "image" && (object.role === undefined || object.role === "image")) {
    return object;
  }
  if (object.kind === "spriteSidecar" || object.kind === "sketchOverlay") {
    const targetId = object.targetId ?? object.spec.targetId;
    const target = targetId ? document.objects[targetId] : undefined;
    return target?.kind === "image" ? target : undefined;
  }
  if (object.kind === "mechanicalAnnotationSidecar") {
    const target = object.targetObjectId ? document.objects[object.targetObjectId] : undefined;
    return target?.kind === "image" ? target : undefined;
  }
  if (object.kind === "blockoutSidecar") {
    const target = object.targetObjectId ? document.objects[object.targetObjectId] : undefined;
    return target?.kind === "image" ? target : undefined;
  }
  if (object.kind === "guideSidecar") {
    const targetId = object.targetId ?? object.guide.target;
    const target = targetId ? document.objects[targetId] : undefined;
    return target?.kind === "image" ? target : undefined;
  }
  if (object.kind === "image" && (object.role === "alphaMap" || object.role === "mask")) {
    return Object.values(document.objects).find(
      (candidate): candidate is ImageObject =>
        candidate.kind === "image" &&
        (candidate.role === undefined || candidate.role === "image") &&
        candidate.alphaMapId === object.id,
    );
  }
  return undefined;
}

export function getObjectLayer(document: CanvasDocument, object: CanvasObject | undefined) {
  if (!object) return undefined;
  return document.layers.find((layer) => layer.id === object.layerId);
}

export function getDefaultImageLayerId(document: CanvasDocument): string {
  const selected = getSelectedObject(document);
  if (selected && document.layers.some((layer) => layer.id === selected.layerId)) {
    return selected.layerId;
  }

  return (
    document.layers.find((layer) => layer.id === "foreground")?.id ??
    document.layers.find((layer) => layer.visible)?.id ??
    document.layers[0]?.id ??
    "foreground"
  );
}

export function getKindClass(object: CanvasObject): string {
  return matchEnum(object.kind, {
    rect: () => "kind-rect",
    ellipse: () => "kind-ellipse",
    path: () => "kind-rect",
    text: () => "kind-text",
    image: () => "kind-image",
    uiComponent: () => "kind-ui",
    sketchOverlay: () => "kind-sketch",
    spriteSidecar: () => "kind-sprite",
    guideSidecar: () => "kind-guide",
    blockoutSidecar: () => "kind-blockout",
    mechanicalAnnotationSidecar: () => "kind-guide",
    sticker: () => "kind-sticker",
  });
}

export function getKindShortLabel(object: CanvasObject): string {
  return matchEnum(object.kind, {
    rect: () => "RECT",
    ellipse: () => "OVAL",
    path: () => "PATH",
    text: () => "TEXT",
    image: () =>
      object.kind === "image"
        ? object.role === "alphaMap"
          ? "ALPHA"
          : object.role === "mask"
            ? "MASK"
            : "IMG"
        : "IMG",
    uiComponent: () => "UI",
    sketchOverlay: () => "SKETCH",
    spriteSidecar: () => "SPRITE",
    guideSidecar: () => "GUIDE",
    blockoutSidecar: () => "BLOCK",
    mechanicalAnnotationSidecar: () => "ANNO",
    sticker: () => "STICKER",
  });
}

export function getSketchOverlayForImage(document: CanvasDocument, object: ImageObject) {
  if (!object.sketchOverlayId) return undefined;
  const overlay = document.objects[object.sketchOverlayId];
  if (overlay?.kind !== "sketchOverlay" || overlay.targetId !== object.id) return undefined;
  return overlay;
}

export function getSpriteSidecarForImage(document: CanvasDocument, object: ImageObject) {
  if (!object.spriteSidecarId) return undefined;
  const sidecar = document.objects[object.spriteSidecarId];
  if (sidecar?.kind !== "spriteSidecar" || sidecar.targetId !== object.id) return undefined;
  return sidecar;
}

export function getSpriteSidecarTarget(document: CanvasDocument, object: SpriteSidecarObject) {
  if (!object.targetId) return undefined;
  const target = document.objects[object.targetId];
  if (target?.kind !== "image") return undefined;
  return target;
}

export function getGuideSidecarsForImage(
  document: CanvasDocument,
  object: ImageObject,
): readonly GuideSidecarObject[] {
  return Object.values(document.objects).filter(
    (candidate): candidate is GuideSidecarObject =>
      candidate.kind === "guideSidecar" && candidate.targetId === object.id,
  );
}

export function getBlockoutSidecarsForObject(
  document: CanvasDocument,
  object: CanvasObject,
): readonly BlockoutSidecarObject[] {
  return Object.values(document.objects).filter(
    (candidate): candidate is BlockoutSidecarObject =>
      candidate.kind === "blockoutSidecar" && candidate.targetObjectId === object.id,
  );
}

export function getMechanicalAnnotationSidecarsForObject(
  document: CanvasDocument,
  object: CanvasObject,
): readonly MechanicalAnnotationSidecarObject[] {
  return Object.values(document.objects).filter(
    (candidate): candidate is MechanicalAnnotationSidecarObject =>
      candidate.kind === "mechanicalAnnotationSidecar" && candidate.targetObjectId === object.id,
  );
}

export function formatSpriteAuditScope(scope: SpriteAuditScope) {
  return scope === "selectedFrame" ? "selected frame only" : "all frames";
}

export function downloadBlobFile(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const anchor = window.document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  window.document.body.append(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

export type SpriteAuditArtifact = {
  scope: SpriteAuditScope;
  report: SpriteAuditReport;
  text: string;
};

export type SpriteAuditScreenshotArtifact = {
  path: string;
  mimeType: string;
  blob: Blob;
  size: number;
  url: string;
};

export function getDiagnosticClass(diagnostic: GeometryDiagnostic): string {
  return matchEnum(diagnostic.severity, {
    info: () => "diagnostic-info",
    warning: () => "diagnostic-warning",
  });
}

export function makeInvalidJsonResult(message: string): CanvasCommandValidationResult {
  return {
    ok: false,
    diagnostics: [
      {
        severity: "error",
        code: "InvalidJson",
        message,
      },
    ],
  };
}

export function parseCommandJson(
  commandJson: string,
): { ok: true; value: unknown } | { ok: false; validation: CanvasCommandValidationResult } {
  try {
    return { ok: true, value: JSON.parse(commandJson) as unknown };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Command JSON could not be parsed.";
    return { ok: false, validation: makeInvalidJsonResult(message) };
  }
}

export function normalizeCommands(commands: unknown): CanvasCommand[] {
  return (Array.isArray(commands) ? commands : [commands]) as CanvasCommand[];
}

export function formatCommandKinds(commands: readonly CanvasCommand[]): string {
  return commands.map((command) => commandKindLabels[command.kind]).join(", ");
}

export function formatChange(change: CanvasCommandApplyResult["changes"][number]): string {
  return `${change.objectId}.${change.field}: ${String(change.before)} -> ${String(change.after)}`;
}

export function formatBlobSize(size: number): string {
  if (size < 1024) return `${size.toLocaleString()} B`;
  if (size < 1024 * 1024) return `${Math.round(size / 102.4) / 10} KB`;
  return `${Math.round(size / 1024 / 102.4) / 10} MB`;
}

export function formatDocumentSize(document: CanvasDocument): string {
  const unitSystem = getCanvasUnitSystem(document);
  return `${formatCanvasMeasurement(document.width, unitSystem)} x ${formatCanvasMeasurement(
    document.height,
    unitSystem,
  )}`;
}

export function formatFrameIntent(frame: CanvasFrame | undefined): string {
  if (!frame) return "kind: implicit absolute";

  const entries = Object.entries(frame).filter(([, value]) => value !== undefined);
  return entries.map(([key, value]) => `${key}: ${String(value)}`).join("; ");
}

export function getSelectedExportFile(
  bundle: CanvasExportBundle | undefined,
  selectedPath: string | undefined,
): CanvasExportFile | undefined {
  if (!bundle) return undefined;
  return bundle.files.find((file) => file.path === selectedPath) ?? bundle.files[0];
}

export function isToolGroupVisibleForMode(
  mode: CanvasEditorModeTemplate,
  group: CanvasToolGroupId,
): boolean {
  return mode.visibleToolGroups?.includes(group) ?? true;
}
