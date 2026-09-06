import { defineCanvasCommand } from "../../core/commands/contracts";
import type { CanvasDocument, GuideSidecarObject } from "../../sceneModel";

export type SetGuideSidecarShowLabelsCommand = {
  kind: "setGuideSidecarShowLabels";
  guideId: string;
  showLabels: boolean;
};

export type GuideCommand = SetGuideSidecarShowLabelsCommand;

export const setGuideSidecarShowLabelsCommandDefinition = defineCanvasCommand<
  CanvasDocument,
  SetGuideSidecarShowLabelsCommand
>({
  kind: "setGuideSidecarShowLabels",
  is: (command): command is SetGuideSidecarShowLabelsCommand =>
    command.kind === "setGuideSidecarShowLabels",
  validate(document, command, commandIndex) {
    const guide = document.objects[command.guideId];
    if (guide?.kind !== "guideSidecar") {
      return [
        {
          severity: "error",
          code: "MissingGuideSidecar",
          message: `Guide sidecar "${command.guideId}" does not exist.`,
          commandIndex,
          objectId: command.guideId,
        },
      ];
    }
    if (typeof command.showLabels !== "boolean") {
      return [
        {
          severity: "error",
          code: "InvalidCommand",
          message: "showLabels must be a boolean.",
          commandIndex,
          objectId: command.guideId,
        },
      ];
    }
    return [];
  },
  apply(document, command) {
    const guide = document.objects[command.guideId] as GuideSidecarObject;
    if (guide.showLabels === command.showLabels) {
      return {
        document,
        command,
        changes: [],
        message: `Guide sidecar ${command.guideId} labels were already ${command.showLabels ? "shown" : "hidden"}.`,
      };
    }
    return {
      document: {
        ...document,
        objects: {
          ...document.objects,
          [guide.id]: { ...guide, showLabels: command.showLabels },
        },
      },
      command,
      changes: [
        {
          objectId: guide.id,
          field: "showLabels",
          before: guide.showLabels,
          after: command.showLabels,
        },
      ],
      message: `Set guide sidecar ${command.guideId} labels ${command.showLabels ? "shown" : "hidden"}.`,
    };
  },
});
