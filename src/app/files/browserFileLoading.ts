import type { LoadedImageAsset } from "../../imageAssets";
import { browserFileService, type CanvasTextFile } from "../browser/BrowserEditorServices";

/** Browser/File API boundary. Semantic controllers consume these plain values. */
export async function readCanvasTextFile(file: File): Promise<CanvasTextFile> {
  return browserFileService.readText(file);
}

export async function readCanvasImageFile(
  file: File,
  options?: { readonly idPrefix?: string },
): Promise<LoadedImageAsset> {
  return browserFileService.readImage(file, options);
}

export type { CanvasTextFile } from "../browser/BrowserEditorServices";
