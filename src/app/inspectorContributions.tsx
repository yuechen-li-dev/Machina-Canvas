import type { ReactNode } from "react";
import { guideInspectorContribution } from "../modules/guides/ui/GuideInspectorContribution";
import { mechanicalInspectorContribution } from "../modules/mechanical/ui/MechanicalInspectorContribution";
import { spriteInspectorContribution } from "../modules/sprites/ui/SpriteInspectorContribution";
import { stickerInspectorContribution } from "../modules/stickers/inspector";
import { webUiInspectorContribution } from "../modules/webUi/ui/WebUiInspectorContribution";
import type { CanvasCommand } from "../sceneCommands";
import type { CanvasDocument, CanvasObject } from "../sceneModel";
import type { InspectorGroupId } from "./editor/editorShared";

export type CanvasInspectorContext<TObject extends CanvasObject = CanvasObject> = {
  readonly object: TObject;
  readonly document: CanvasDocument;
  readonly runCommand: (command: CanvasCommand) => void;
  readonly panel: {
    readonly contextKey: string;
    readonly isOpen: (groupId: InspectorGroupId) => boolean;
    readonly setOpen: (groupId: InspectorGroupId, open: boolean) => void;
  };
};

export type CanvasInspectorContribution = {
  readonly id: string;
  readonly order: number;
  readonly supports: (object: CanvasObject) => boolean;
  readonly renderSummary?: (context: CanvasInspectorContext) => ReactNode;
  readonly renderPanels?: (context: CanvasInspectorContext) => ReactNode;
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
  guideInspectorContribution,
  mechanicalInspectorContribution,
  spriteInspectorContribution,
  stickerInspectorContribution,
  webUiInspectorContribution,
]);

function getContribution(context: CanvasInspectorContext): CanvasInspectorContribution | undefined {
  return inspectorContributions.find((contribution) => contribution.supports(context.object));
}

export function renderCanvasModuleInspectorSummary(context: CanvasInspectorContext): ReactNode {
  return getContribution(context)?.renderSummary?.(context);
}

/** Compatibility helper for summary-only contributions used by focused module tests. */
export function renderCanvasModuleInspector(
  context: Pick<CanvasInspectorContext, "object" | "runCommand">,
): ReactNode {
  const contribution = inspectorContributions.find((candidate) =>
    candidate.supports(context.object),
  );
  return contribution?.renderSummary?.(context as CanvasInspectorContext);
}

export function renderCanvasModuleInspectorPanels(context: CanvasInspectorContext): ReactNode {
  return inspectorContributions
    .filter((contribution) => contribution.supports(context.object))
    .map((contribution) => contribution.renderPanels?.(context));
}
