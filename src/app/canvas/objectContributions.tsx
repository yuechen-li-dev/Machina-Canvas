import type { MouseEvent, ReactNode } from "react";
import { stickerOverlayContribution } from "../../modules/stickers/ui/overlay";
import { stickerRendererContribution } from "../../modules/stickers/ui/renderer";
import type { CanvasDocument, CanvasObject } from "../../sceneModel";

export type CanvasObjectRenderContext = {
  readonly document: CanvasDocument;
  readonly object: CanvasObject;
  readonly selected: boolean;
  readonly onSelect: (id: string) => void;
  readonly commonSvgProps: {
    readonly "data-canvas-object-id": string;
    readonly "data-canvas-kind": string;
    readonly "data-canvas-name": string;
    readonly onClick: (event: MouseEvent) => void;
  };
};

export type CanvasObjectRendererContribution = {
  readonly id: string;
  readonly order: number;
  readonly supports: (object: CanvasObject) => boolean;
  readonly render: (context: CanvasObjectRenderContext) => ReactNode;
};

export type CanvasOverlayContribution = {
  readonly id: string;
  readonly order: number;
  readonly supports: (context: CanvasObjectRenderContext) => boolean;
  readonly render: (context: CanvasObjectRenderContext) => ReactNode;
};

function defineOrderedContributions<T extends { id: string; order: number }>(
  contributionKind: string,
  contributions: readonly T[],
): readonly T[] {
  const ids = new Set<string>();
  return Object.freeze(
    [...contributions]
      .map((contribution) => {
        const id = contribution.id.trim();
        if (!id) throw new Error(`${contributionKind} contribution id must be non-empty.`);
        if (ids.has(id)) throw new Error(`Duplicate ${contributionKind} contribution id "${id}".`);
        ids.add(id);
        return Object.freeze({ ...contribution, id });
      })
      .sort((left, right) => left.order - right.order || left.id.localeCompare(right.id)),
  );
}

export const canvasObjectRendererContributions = defineOrderedContributions("renderer", [
  stickerRendererContribution,
]);

export const canvasOverlayContributions = defineOrderedContributions("overlay", [
  stickerOverlayContribution,
]);

export function renderCanvasModuleObject(context: CanvasObjectRenderContext): ReactNode {
  return canvasObjectRendererContributions
    .find((contribution) => contribution.supports(context.object))
    ?.render(context);
}

export function renderCanvasModuleOverlays(context: CanvasObjectRenderContext): ReactNode {
  return canvasOverlayContributions
    .filter((contribution) => contribution.supports(context))
    .map((contribution) => <g key={contribution.id}>{contribution.render(context)}</g>);
}
