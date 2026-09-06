import type { CanvasOverlayContribution } from "../../../app/canvas/objectContributions";

export const stickerOverlayContribution: CanvasOverlayContribution = {
  id: "stickers.selected-label-overlay",
  order: 100,
  supports: ({ object, selected }) => selected && object.kind === "sticker",
  render({ object }) {
    if (object.kind !== "sticker") return null;
    return (
      <text
        className="canvas-sticker-overlay-label"
        data-canvas-overlay-id="stickers.selected-label-overlay"
        x={object.x}
        y={object.y - 9}
        fontSize={11}
      >
        Sticker: {object.label}
      </text>
    );
  },
};
