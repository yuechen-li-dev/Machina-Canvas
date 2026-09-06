import type { ReactNode } from "react";
import type { CanvasCommand } from "../sceneCommands";
import type { CanvasObject, CanvasObjectKind } from "../sceneModel";
import { stickerInspectorContribution } from "../modules/stickers/inspector";

export type CanvasInspectorContext<TObject extends CanvasObject = CanvasObject> = {
  readonly object: TObject;
  readonly runCommand: (command: CanvasCommand) => void;
};

export type CanvasInspectorContribution = {
  readonly id: string;
  readonly kind: CanvasObjectKind;
  readonly render: (context: CanvasInspectorContext) => ReactNode;
};

const inspectorContributions: readonly CanvasInspectorContribution[] = [
  stickerInspectorContribution,
];

export function renderCanvasModuleInspector(context: CanvasInspectorContext): ReactNode {
  return inspectorContributions
    .find((contribution) => contribution.kind === context.object.kind)
    ?.render(context);
}
