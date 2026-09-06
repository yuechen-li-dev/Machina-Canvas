import {
  type CanvasViewport,
  getCanvasViewportViewBox,
  panCanvasViewport,
} from "../../canvasViewport";
import type { CanvasDocument } from "../../sceneModel";
import type { CanvasPanState, SpriteDragState } from "../editor/editorShared";

export type ClientBounds = {
  readonly left: number;
  readonly top: number;
  readonly width: number;
  readonly height: number;
};

export function clientPointToCanvas(
  bounds: ClientBounds,
  viewBox: {
    readonly x: number;
    readonly y: number;
    readonly width: number;
    readonly height: number;
  },
  clientX: number,
  clientY: number,
): { readonly x: number; readonly y: number } | undefined {
  if (bounds.width <= 0 || bounds.height <= 0) return undefined;
  return {
    x: viewBox.x + ((clientX - bounds.left) / bounds.width) * viewBox.width,
    y: viewBox.y + ((clientY - bounds.top) / bounds.height) * viewBox.height,
  };
}

export function beginCanvasPan(
  clientX: number,
  clientY: number,
  viewport: CanvasViewport,
): CanvasPanState {
  return { startClientX: clientX, startClientY: clientY, startViewport: viewport };
}

export function resolveCanvasPan(
  document: CanvasDocument,
  state: CanvasPanState,
  bounds: ClientBounds,
  clientX: number,
  clientY: number,
): CanvasViewport | undefined {
  if (bounds.width <= 0 || bounds.height <= 0) return undefined;
  const startViewBox = getCanvasViewportViewBox(document, state.startViewport);
  const dx = ((clientX - state.startClientX) / bounds.width) * startViewBox.width;
  const dy = ((clientY - state.startClientY) / bounds.height) * startViewBox.height;
  return panCanvasViewport(state.startViewport, { dx, dy });
}

export function moveSpriteDrag(
  state: SpriteDragState,
  point: { readonly x: number; readonly y: number },
): SpriteDragState {
  return { ...state, currentPoint: point };
}

export function didSpriteFrameChange(
  state: SpriteDragState,
  finalRect: {
    readonly x: number;
    readonly y: number;
    readonly width: number;
    readonly height: number;
  },
): boolean {
  return (
    finalRect.x !== state.startRect.x ||
    finalRect.y !== state.startRect.y ||
    finalRect.width !== state.startRect.width ||
    finalRect.height !== state.startRect.height
  );
}
