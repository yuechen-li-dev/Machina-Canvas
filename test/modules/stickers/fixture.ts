import { createCanvasUnitSystem } from "../../../src/canvasUnits";
import type { CanvasDocument, StickerObject } from "../../../src/sceneModel";

export const stickerFixture: StickerObject = {
  id: "sticker-alpha",
  name: "Alpha",
  kind: "sticker",
  layerId: "notes",
  visible: true,
  x: 12,
  y: 18,
  width: 96,
  height: 40,
  fill: "#ffe66d",
  stroke: "#28251d",
  label: "Alpha",
};

export function createStickerFixtureDocument(
  objects: CanvasDocument["objects"] = {},
): CanvasDocument {
  return {
    id: "sticker-proof",
    name: "Sticker proof",
    width: 320,
    height: 200,
    unit: "px",
    unitSystem: createCanvasUnitSystem("px"),
    layers: [
      {
        id: "notes",
        name: "Notes",
        visible: true,
        objectIds: Object.keys(objects),
      },
    ],
    objects,
  };
}
