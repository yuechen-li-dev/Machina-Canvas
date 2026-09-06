import {
  type CanvasCommandDefinition,
  type CanvasCommandLike,
  defineCanvasCommandRegistry,
} from "../core/commands/contracts";
import type { CanvasDocument } from "../sceneModel";
import { type GuideCommand, setGuideSidecarShowLabelsCommandDefinition } from "./guides/command";
import {
  addStickerCommandDefinition,
  renameStickerCommandDefinition,
  type StickerCommand,
} from "./stickers/command";

export type CanvasModuleCommand = GuideCommand | StickerCommand;

export const canvasModuleCommandDefinitions = [
  setGuideSidecarShowLabelsCommandDefinition,
  addStickerCommandDefinition,
  renameStickerCommandDefinition,
] as readonly CanvasCommandDefinition<CanvasDocument, CanvasCommandLike>[];

const canvasModuleCommandRegistry = defineCanvasCommandRegistry(canvasModuleCommandDefinitions);

export function getCanvasModuleCommandDefinition(kind: string) {
  return canvasModuleCommandRegistry.get(kind);
}

export function isCanvasModuleCommand(command: CanvasCommandLike): command is CanvasModuleCommand {
  return getCanvasModuleCommandDefinition(command.kind)?.is(command) ?? false;
}
