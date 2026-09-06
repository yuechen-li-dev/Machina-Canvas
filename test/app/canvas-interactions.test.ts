import { describe, expect, it } from "vitest";
import {
  beginCanvasPan,
  clientPointToCanvas,
  didSpriteFrameChange,
  moveSpriteDrag,
  resolveCanvasPan,
} from "../../src/app/canvas/interactions";
import { createCanvasViewport } from "../../src/canvasViewport";
import { createBlankCanvasScene } from "../../src/sceneTemplates";

describe("canvas interaction helpers", () => {
  it("maps client coordinates and rejects zero-sized surfaces", () => {
    expect(
      clientPointToCanvas(
        { left: 10, top: 20, width: 100, height: 50 },
        { x: 0, y: 0, width: 200, height: 100 },
        60,
        45,
      ),
    ).toEqual({ x: 100, y: 50 });
    expect(
      clientPointToCanvas(
        { left: 0, top: 0, width: 0, height: 50 },
        { x: 0, y: 0, width: 1, height: 1 },
        0,
        0,
      ),
    ).toBeUndefined();
  });

  it("resolves pan from an explicit interaction state", () => {
    const document = createBlankCanvasScene();
    const viewport = createCanvasViewport(document);
    const state = beginCanvasPan(0, 0, viewport);
    const next = resolveCanvasPan(
      document,
      state,
      { left: 0, top: 0, width: 100, height: 100 },
      10,
      20,
    );
    expect(next).toBeDefined();
    expect(next?.centerX).not.toBe(viewport.centerX);
  });

  it("updates sprite drag state and detects a changed frame", () => {
    const state = {
      sidecarId: "sidecar",
      frameId: "frame",
      imageId: "image",
      mode: "move" as const,
      startPoint: { x: 0, y: 0 },
      currentPoint: { x: 0, y: 0 },
      startRect: { x: 0, y: 0, width: 10, height: 10 },
    };
    expect(moveSpriteDrag(state, { x: 4, y: 5 }).currentPoint).toEqual({ x: 4, y: 5 });
    expect(didSpriteFrameChange(state, { x: 1, y: 0, width: 10, height: 10 })).toBe(true);
  });
});
