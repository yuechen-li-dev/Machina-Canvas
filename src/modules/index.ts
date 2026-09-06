import { defineCanvasModules } from "../core/modules/types";
import {
  graphicsModule,
  guideModule,
  imageModule,
  mechanicalModule,
  spriteCardsModule,
  spriteModule,
  stickerModule,
  webUiModule,
} from "./definitions";

export const canvasModules = defineCanvasModules([
  mechanicalModule,
  graphicsModule,
  webUiModule,
  spriteCardsModule,
  spriteModule,
  imageModule,
  guideModule,
  stickerModule,
]);

export type { CanvasModule } from "../core/modules/types";
export {
  collectModuleContributions,
  defineCanvasModules,
} from "../core/modules/types";
