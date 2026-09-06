import type { LoadedImageAsset } from "../../imageAssets";
import { createImageObjectFromAsset, makeUniqueObjectId } from "../../imageAssets";
import {
  addObjectToLayerGroup,
  applyCanvasCommands,
  attachAlphaMapToImage,
  attachSketchOverlayToImage,
  type CanvasCommand,
  type CanvasCommandApplyContext,
  type CanvasCommandApplyResult,
  type CanvasCommandValidationResult,
  validateCanvasCommands,
} from "../../sceneCommands";
import type { CanvasDocument, CanvasImageRole } from "../../sceneModel";
import { createSketchOverlayObject, parseSketchOverlayToml } from "../../sketchOverlay";

export type ImageLoadResult = {
  readonly document: CanvasDocument;
  readonly message: string;
  readonly commands?: readonly CanvasCommand[];
  readonly commandResults?: readonly CanvasCommandApplyResult[];
  readonly validation?: CanvasCommandValidationResult;
};

export function addImageAsset(
  document: CanvasDocument,
  asset: LoadedImageAsset,
  options: {
    readonly role: CanvasImageRole;
    readonly layerId: string;
    readonly groupId?: string;
    readonly attachToImageId?: string;
    readonly commandOptions?: CanvasCommandApplyContext;
  },
): ImageLoadResult {
  const object = createImageObjectFromAsset(asset, {
    id: makeUniqueObjectId(asset.id, document),
    layerId: options.layerId,
    role: options.role,
    document,
  });
  const command: CanvasCommand = { kind: "addImageObject", object };
  const validation = validateCanvasCommands(document, command);
  if (!validation.ok) {
    return { document, message: "image asset command invalid", validation };
  }
  const applied = applyCanvasCommands(document, [command], options.commandOptions);
  let nextDocument = applied.document;
  if (options.groupId) {
    nextDocument = addObjectToLayerGroup(nextDocument, options.groupId, object.id);
  }
  if (options.role === "alphaMap" && options.attachToImageId) {
    nextDocument = attachAlphaMapToImage(nextDocument, options.attachToImageId, object.id);
  }
  return {
    document: { ...nextDocument, selectedObjectId: object.id },
    message: `loaded image asset ${asset.name}`,
    commands: [command],
    commandResults: applied.results,
    validation,
  };
}

export function addSketchOverlay(
  document: CanvasDocument,
  file: { readonly name: string; readonly text: string },
  options: {
    readonly layerId: string;
    readonly targetId?: string;
    readonly groupId?: string;
  },
): ImageLoadResult {
  const target = options.targetId ? document.objects[options.targetId] : undefined;
  const targetImage = target?.kind === "image" ? target : undefined;
  const baseName = file.name.replace(/\.sketch\.toml$/i, "").replace(/\.toml$/i, "");
  const overlayId = makeUniqueObjectId(
    `${(targetImage?.id ?? baseName) || "sketch-overlay"}-sketch`,
    document,
  );
  const spec = parseSketchOverlayToml(file.text, {
    id: overlayId,
    name: baseName || "Sketch overlay",
    targetId: targetImage?.id,
  });
  const object = createSketchOverlayObject(spec, {
    id: overlayId,
    name: spec.name,
    target: targetImage,
    layerId: options.layerId,
  });
  let nextDocument: CanvasDocument = {
    ...document,
    objects: { ...document.objects, [object.id]: object },
    layers: document.layers.map((layer) =>
      layer.id === object.layerId && !layer.objectIds.includes(object.id)
        ? { ...layer, objectIds: [...layer.objectIds, object.id] }
        : layer,
    ),
    selectedObjectId: object.id,
  };
  if (options.groupId) {
    nextDocument = addObjectToLayerGroup(nextDocument, options.groupId, object.id);
  }
  if (targetImage) {
    nextDocument = attachSketchOverlayToImage(nextDocument, targetImage.id, object.id);
  }
  return { document: nextDocument, message: `loaded sketch overlay ${file.name}` };
}
