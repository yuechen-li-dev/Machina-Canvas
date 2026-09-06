import type { CanvasInspectorContribution } from "../../app/inspectorContributions";

export const stickerInspectorContribution: CanvasInspectorContribution = {
  id: "stickers.label",
  order: 100,
  supports: (object) => object.kind === "sticker",
  render({ object, runCommand }) {
    if (object.kind !== "sticker") return null;
    return (
      <label className="field-row">
        <span>Sticker label</span>
        <input
          aria-label="Sticker label"
          onChange={(event) =>
            runCommand({
              kind: "renameSticker",
              id: object.id,
              label: event.target.value,
            })
          }
          type="text"
          value={object.label}
        />
      </label>
    );
  },
};
