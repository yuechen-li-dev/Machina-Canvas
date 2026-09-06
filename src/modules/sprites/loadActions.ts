import { makeUniqueObjectId } from "../../imageAssets";
import {
  addObjectToLayerGroup,
  applyCanvasCommands,
  attachSpriteSidecarToImage,
  type CanvasCommand,
  type CanvasCommandApplyContext,
  type CanvasCommandApplyResult,
  type CanvasCommandValidationResult,
  validateCanvasCommands,
} from "../../sceneCommands";
import type { CanvasDocument } from "../../sceneModel";
import {
  createSpriteSidecarObject,
  createUnattachedSpriteSidecarObject,
  parseSpriteSidecarToml,
} from "../../spriteSidecar";

export type SpriteSidecarLoadResult = {
  readonly document: CanvasDocument;
  readonly message: string;
  readonly commands?: readonly CanvasCommand[];
  readonly commandResults?: readonly CanvasCommandApplyResult[];
  readonly validation: CanvasCommandValidationResult;
};

export function addSpriteSidecar(
  document: CanvasDocument,
  file: { readonly name: string; readonly text: string },
  options: {
    readonly layerId: string;
    readonly targetId?: string;
    readonly groupId?: string;
    readonly commandOptions?: CanvasCommandApplyContext;
  },
): SpriteSidecarLoadResult {
  const target = options.targetId ? document.objects[options.targetId] : undefined;
  const targetImage = target?.kind === "image" ? target : undefined;
  const baseName = file.name.replace(/\.(spriteforge|sprite)?\.?toml$/i, "");
  const id = makeUniqueObjectId(
    `${(targetImage?.id ?? baseName) || "sprite-sidecar"}-sprite-sidecar`,
    document,
  );
  const spec = parseSpriteSidecarToml(file.text, {
    id,
    name: `${baseName || targetImage?.name || file.name} sprite sidecar`,
    targetId: targetImage?.id,
    sourceName: file.name,
  });
  const object = targetImage
    ? createSpriteSidecarObject(targetImage, spec)
    : createUnattachedSpriteSidecarObject(spec, { layerId: options.layerId });
  const command: CanvasCommand = {
    kind: "addSpriteSidecarObject",
    object,
    attach: Boolean(targetImage),
  };
  const validation = validateCanvasCommands(document, command);
  if (!validation.ok) {
    return { document, message: "sprite sidecar command invalid", validation };
  }
  const applied = applyCanvasCommands(document, [command], options.commandOptions);
  let nextDocument = applied.document;
  if (options.groupId) {
    nextDocument = addObjectToLayerGroup(nextDocument, options.groupId, object.id);
  }
  if (targetImage) {
    nextDocument = attachSpriteSidecarToImage(nextDocument, targetImage.id, object.id);
  }
  return {
    document: { ...nextDocument, selectedObjectId: object.id },
    message: `loaded sprite sidecar ${file.name}`,
    commands: [command],
    commandResults: applied.results,
    validation,
  };
}
