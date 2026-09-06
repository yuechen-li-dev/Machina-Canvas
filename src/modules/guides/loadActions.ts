import {
  createBlockoutSidecarObject,
  createUnattachedBlockoutSidecarObject,
  parseBlockoutSidecarToml,
} from "../../blockoutSidecar";
import {
  createGuideSidecarObject,
  createUnattachedGuideSidecarObject,
  parseGuideSidecarToml,
} from "../../guideSidecar";
import { makeUniqueObjectId } from "../../imageAssets";
import {
  addObjectToLayerGroup,
  applyCanvasCommands,
  attachGuideSidecarToImage,
  type CanvasCommand,
  type CanvasCommandApplyContext,
  type CanvasCommandApplyResult,
  type CanvasCommandValidationResult,
  validateCanvasCommands,
} from "../../sceneCommands";
import type { CanvasDocument } from "../../sceneModel";

export type GuideLoadResult = {
  readonly document: CanvasDocument;
  readonly message: string;
  readonly commands?: readonly CanvasCommand[];
  readonly commandResults?: readonly CanvasCommandApplyResult[];
  readonly validation: CanvasCommandValidationResult;
};

type SidecarLoadOptions = {
  readonly layerId: string;
  readonly targetId?: string;
  readonly groupId?: string;
  readonly commandOptions?: CanvasCommandApplyContext;
};

export function addGuideSidecar(
  document: CanvasDocument,
  file: { readonly name: string; readonly text: string },
  options: SidecarLoadOptions,
): GuideLoadResult {
  const target = options.targetId ? document.objects[options.targetId] : undefined;
  const targetImage = target?.kind === "image" ? target : undefined;
  const baseName = file.name.replace(/\.guide\.toml$/i, "").replace(/\.toml$/i, "");
  const id = makeUniqueObjectId(
    `${(targetImage?.id ?? baseName) || "guide-sidecar"}-guide-sidecar`,
    document,
  );
  const guide = parseGuideSidecarToml(file.text);
  const name = `${baseName || targetImage?.name || file.name}.guide.toml`;
  const object = targetImage
    ? createGuideSidecarObject(targetImage, { ...guide, id, rawToml: file.text }, { name })
    : createUnattachedGuideSidecarObject(
        { ...guide, id, rawToml: file.text },
        { layerId: options.layerId, name },
      );
  const command: CanvasCommand = {
    kind: "addGuideSidecarObject",
    object,
    attach: Boolean(targetImage),
  };
  const validation = validateCanvasCommands(document, command);
  if (!validation.ok) {
    return { document, message: "guide sidecar command invalid", validation };
  }
  const applied = applyCanvasCommands(document, [command], options.commandOptions);
  let nextDocument = applied.document;
  if (options.groupId) {
    nextDocument = addObjectToLayerGroup(nextDocument, options.groupId, object.id);
  }
  if (targetImage) {
    nextDocument = attachGuideSidecarToImage(nextDocument, targetImage.id, object.id);
  }
  return {
    document: { ...nextDocument, selectedObjectId: object.id },
    message: `loaded guide sidecar ${file.name}`,
    commands: [command],
    commandResults: applied.results,
    validation,
  };
}

export function addBlockoutSidecar(
  document: CanvasDocument,
  file: { readonly name: string; readonly text: string },
  options: SidecarLoadOptions,
): GuideLoadResult {
  const target = options.targetId ? document.objects[options.targetId] : undefined;
  const baseName = file.name.replace(/\.blockout\.toml$/i, "").replace(/\.toml$/i, "");
  const id = makeUniqueObjectId(
    `${(target?.id ?? baseName) || "blockout-sidecar"}-blockout-sidecar`,
    document,
  );
  const blockout = parseBlockoutSidecarToml(file.text);
  const name = `${baseName || target?.name || file.name}.blockout.toml`;
  const object = target
    ? createBlockoutSidecarObject(target, { ...blockout, id, rawToml: file.text }, { name })
    : createUnattachedBlockoutSidecarObject(
        { ...blockout, id, rawToml: file.text },
        { layerId: options.layerId, name },
      );
  const command: CanvasCommand = {
    kind: "addBlockoutSidecarObject",
    object,
    attach: Boolean(target),
  };
  const validation = validateCanvasCommands(document, command);
  if (!validation.ok) {
    return { document, message: "blockout sidecar command invalid", validation };
  }
  const applied = applyCanvasCommands(document, [command], options.commandOptions);
  let nextDocument = applied.document;
  if (options.groupId) {
    nextDocument = addObjectToLayerGroup(nextDocument, options.groupId, object.id);
  }
  if (target) {
    nextDocument = applyCanvasCommands(
      nextDocument,
      [{ kind: "attachBlockoutSidecar", targetObjectId: target.id, blockoutId: object.id }],
      options.commandOptions,
    ).document;
  }
  return {
    document: { ...nextDocument, selectedObjectId: object.id },
    message: `loaded blockout sidecar ${file.name}`,
    commands: [command],
    commandResults: applied.results,
    validation,
  };
}
