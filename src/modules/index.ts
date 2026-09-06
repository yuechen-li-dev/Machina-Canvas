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

export {
  defineCanvasModules,
  collectModuleContributions,
} from "../core/modules/types";
export type { CanvasModule } from "../core/modules/types";
