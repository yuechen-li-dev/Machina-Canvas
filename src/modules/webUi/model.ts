import type { CanvasObjectBase } from "../../core/document/model";

export type CanvasUiPropValue =
  | string
  | number
  | boolean
  | null
  | readonly string[]
  | readonly number[];
export type UiComponentObject = CanvasObjectBase<"uiComponent"> & {
  componentId: string;
  variant?: string;
  props: Record<string, CanvasUiPropValue>;
  exportName?: string;
};
export type WebUiCanvasObject = UiComponentObject;
