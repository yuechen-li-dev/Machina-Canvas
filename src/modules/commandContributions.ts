import {
  type CanvasCommandDefinition,
  type CanvasCommandLike,
  defineCanvasCommandRegistry,
} from "../core/commands/contracts";
import type { CanvasDocument } from "../sceneModel";
import { addStickerCommandDefinition, renameStickerCommandDefinition } from "./stickers/command";

export const canvasModuleCommandDefinitions = [
  addStickerCommandDefinition,
  renameStickerCommandDefinition,
] as readonly CanvasCommandDefinition<CanvasDocument, CanvasCommandLike>[];

const canvasModuleCommandRegistry = defineCanvasCommandRegistry(canvasModuleCommandDefinitions);

export function getCanvasModuleCommandDefinition(kind: string) {
  return canvasModuleCommandRegistry.get(kind);
}
