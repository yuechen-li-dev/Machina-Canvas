import type { CanvasExportContribution } from "../export/contributions";
import { stickerExportContribution } from "./stickers/export";

export const canvasModuleExportContributions: readonly CanvasExportContribution[] = [
  stickerExportContribution,
];
