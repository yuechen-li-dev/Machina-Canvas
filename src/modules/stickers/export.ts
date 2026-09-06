import type { CanvasExportContribution } from "../../export/contributions";

export const stickerExportContribution: CanvasExportContribution = {
  id: "stickers.list",
  collect(document) {
    const stickers = Object.values(document.objects)
      .filter((object) => object.kind === "sticker")
      .map((object) => ({
        id: object.id,
        label: object.label,
        frame: {
          x: object.x,
          y: object.y,
          width: object.width,
          height: object.height,
        },
        src: object.src,
      }));
    if (stickers.length === 0) return [];
    return [
      {
        path: "stickers/stickers.json",
        mimeType: "application/json",
        text: `${JSON.stringify({ stickers }, null, 2)}\n`,
      },
    ];
  },
};
