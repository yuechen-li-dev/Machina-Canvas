import type { CanvasObjectBase } from "../../core/document/model";

export type StickerObject = CanvasObjectBase<"sticker"> & {
  label: string;
  src?: string;
};
export type StickerCanvasObject = StickerObject;
