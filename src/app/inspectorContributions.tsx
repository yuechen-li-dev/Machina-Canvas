import type { ReactNode } from "react";
import { stickerInspectorContribution } from "../modules/stickers/inspector";
import type { CanvasCommand } from "../sceneCommands";
import type { CanvasObject } from "../sceneModel";

export type CanvasInspectorContext<TObject extends CanvasObject = CanvasObject> = {
  readonly object: TObject;
  readonly runCommand: (command: CanvasCommand) => void;
};

export type CanvasInspectorContribution = {
  readonly id: string;
  readonly order: number;
  readonly supports: (object: CanvasObject) => boolean;
  readonly render: (context: CanvasInspectorContext) => ReactNode;
};

export function defineCanvasInspectorContributions(
  contributions: readonly CanvasInspectorContribution[],
): readonly CanvasInspectorContribution[] {
  const ids = new Set<string>();
  return Object.freeze(
    [...contributions]
      .map((contribution) => {
        const id = contribution.id.trim();
        if (!id) throw new Error("Inspector contribution id must be non-empty.");
        if (ids.has(id)) throw new Error(`Duplicate inspector contribution id "${id}".`);
        ids.add(id);
        return Object.freeze({ ...contribution, id });
      })
      .sort((left, right) => left.order - right.order || left.id.localeCompare(right.id)),
  );
}

export const inspectorContributions = defineCanvasInspectorContributions([
  stickerInspectorContribution,
]);

export function renderCanvasModuleInspector(context: CanvasInspectorContext): ReactNode {
  return inspectorContributions
    .find((contribution) => contribution.supports(context.object))
    ?.render(context);
}
