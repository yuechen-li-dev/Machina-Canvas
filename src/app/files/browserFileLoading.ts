import { type LoadedImageAsset, loadImageAssetFromFile } from "../../imageAssets";

export type CanvasTextFile = {
  readonly name: string;
  readonly text: string;
};

/** Browser/File API boundary. Semantic controllers consume these plain values. */
export async function readCanvasTextFile(file: File): Promise<CanvasTextFile> {
  return {
    name: file.name,
    text: await file.text(),
  };
}

export async function readCanvasImageFile(
  file: File,
  options?: { readonly idPrefix?: string },
): Promise<LoadedImageAsset> {
  return loadImageAssetFromFile(file, options);
}
