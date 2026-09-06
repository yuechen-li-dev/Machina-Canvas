import type { StickerObject } from "../../sceneModel";
import type { CanvasToolDefinition } from "../../tools/types";

export const CREATE_STICKER_TOOL_ID = "create-sticker";

export const createStickerTool: CanvasToolDefinition = {
  id: CREATE_STICKER_TOOL_ID,
  label: "Create sticker",
  description: "Creates a small labeled sticker record in the requested layer.",
  targetKind: "document",
  run(input, context) {
    const options = input.options ?? {};
    const layerId =
      typeof options.layerId === "string" ? options.layerId : context.document.layers[0]?.id;
    if (!layerId || !context.document.layers.some((layer) => layer.id === layerId)) {
      throw new Error("create-sticker requires an existing target layer.");
    }
    const requestedId = typeof options.id === "string" ? options.id.trim() : "sticker-1";
    const id = requestedId || "sticker-1";
    const label =
      typeof options.label === "string" && options.label.trim() ? options.label : "Sticker";
    const object: StickerObject = {
      id,
      name: label,
      kind: "sticker",
      layerId,
      visible: true,
      x: typeof options.x === "number" ? options.x : 24,
      y: typeof options.y === "number" ? options.y : 24,
      width: typeof options.width === "number" ? options.width : 120,
      height: typeof options.height === "number" ? options.height : 48,
      fill: typeof options.fill === "string" ? options.fill : "#ffe66d",
      stroke: "#28251d",
      label,
    };
    return {
      toolId: CREATE_STICKER_TOOL_ID,
      commands: [{ kind: "addSticker", object }],
      createdObjectIds: [id],
      notes: [`Prepared sticker ${id}.`],
    };
  },
};
