import type { CanvasObjectRendererContribution } from "../../../app/canvas/objectContributions";

export const stickerRendererContribution: CanvasObjectRendererContribution = {
  id: "stickers.renderer",
  order: 100,
  supports: (object) => object.kind === "sticker",
  render({ object, commonSvgProps }) {
    if (object.kind !== "sticker") return null;
    return (
      <g {...commonSvgProps}>
        <rect
          x={object.x}
          y={object.y}
          width={object.width}
          height={object.height}
          rx={8}
          fill={object.fill ?? "#ffe66d"}
          stroke={object.stroke ?? "#28251d"}
        />
        <text x={object.x + 10} y={object.y + object.height / 2 + 5} fontSize={14} fontWeight={700}>
          {object.label}
        </text>
      </g>
    );
  },
};
