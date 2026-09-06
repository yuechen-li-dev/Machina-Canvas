import { defineCanvasCommand } from "../../core/commands/contracts";
import type { CanvasDocument, StickerObject } from "../../sceneModel";

export type AddStickerCommand = { kind: "addSticker"; object: StickerObject };
export type RenameStickerCommand = {
  kind: "renameSticker";
  id: string;
  label: string;
};
export type StickerCommand = AddStickerCommand | RenameStickerCommand;

export const addStickerCommandDefinition = defineCanvasCommand<CanvasDocument, AddStickerCommand>({
  kind: "addSticker",
  is: (command): command is AddStickerCommand => command.kind === "addSticker",
  validate(document, command, commandIndex) {
    const object = command.object as StickerObject | undefined;
    if (
      object?.kind !== "sticker" ||
      typeof object.id !== "string" ||
      object.id.trim().length === 0
    ) {
      return [
        {
          severity: "error",
          code: "InvalidSticker",
          message: "Sticker object is invalid.",
          commandIndex,
        },
      ];
    }
    if (document.objects[object.id]) {
      return [
        {
          severity: "error",
          code: "DuplicateObject",
          message: `Object "${object.id}" already exists.`,
          commandIndex,
          objectId: object.id,
        },
      ];
    }
    if (!document.layers.some((layer) => layer.id === object.layerId)) {
      return [
        {
          severity: "error",
          code: "MissingLayer",
          message: `Layer "${object.layerId}" does not exist.`,
          commandIndex,
        },
      ];
    }
    return [];
  },
  apply(document, command) {
    const object = { ...command.object };
    return {
      document: {
        ...document,
        selectedObjectId: object.id,
        objects: { ...document.objects, [object.id]: object },
        layers: document.layers.map((layer) =>
          layer.id === object.layerId
            ? { ...layer, objectIds: [...layer.objectIds, object.id] }
            : layer,
        ),
      },
      command,
      changes: [
        {
          objectId: object.id,
          field: "objects",
          before: undefined,
          after: object,
        },
      ],
      message: `Added sticker ${object.id}.`,
    };
  },
});

export const renameStickerCommandDefinition = defineCanvasCommand<
  CanvasDocument,
  RenameStickerCommand
>({
  kind: "renameSticker",
  is: (command): command is RenameStickerCommand => command.kind === "renameSticker",
  validate(document, command, commandIndex) {
    const object = document.objects[command.id];
    if (object?.kind !== "sticker") {
      return [
        {
          severity: "error",
          code: "MissingSticker",
          message: `Sticker "${command.id}" does not exist.`,
          commandIndex,
          objectId: command.id,
        },
      ];
    }
    return typeof command.label === "string" && command.label.trim().length > 0
      ? []
      : [
          {
            severity: "error",
            code: "InvalidStickerLabel",
            message: "Sticker label must be non-empty.",
            commandIndex,
            objectId: command.id,
          },
        ];
  },
  apply(document, command) {
    const object = document.objects[command.id] as StickerObject;
    const next = { ...object, label: command.label, name: command.label };
    return {
      document: {
        ...document,
        objects: { ...document.objects, [command.id]: next },
      },
      command,
      changes: [
        {
          objectId: command.id,
          field: "label",
          before: object.label,
          after: command.label,
        },
      ],
      message: `Renamed sticker ${command.id}.`,
    };
  },
});
