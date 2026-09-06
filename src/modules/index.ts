import { defineCanvasModules } from "../core/modules/types";
import {
  graphicsModule,
  guideModule,
  imageModule,
  mechanicalModule,
  spriteModule,
  stickerModule,
  webUiModule,
} from "./definitions";

export const canvasModules = defineCanvasModules([
  mechanicalModule,
  graphicsModule,
  webUiModule,
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
