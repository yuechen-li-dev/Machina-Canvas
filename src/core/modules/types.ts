import type { CanvasExportContribution } from "../../export/contributions";
import type { CanvasToolDefinition } from "../../tools/types";
import type { CanvasDocument } from "../../sceneModel";

export type CanvasEditorModeId = "blank" | "graphics" | "webUi" | "sprites" | "mechanical";
export type CanvasToolGroupId = "geometry" | "image" | "sprite" | "webUi" | "export" | "viewAids";
export type CanvasEditorModeTemplate = {
  readonly id: CanvasEditorModeId;
  readonly title: string;
  readonly subtitle: string;
  readonly description: string;
  readonly tags: readonly string[];
  readonly createScene: () => CanvasDocument;
  readonly defaultSelectedObjectId?: string;
  readonly visibleToolGroups?: readonly CanvasToolGroupId[];
};

export type CanvasModule = {
  readonly id: string;
  readonly commands?: readonly string[];
  readonly tools?: readonly CanvasToolDefinition[];
  readonly inspectors?: readonly string[];
  readonly exporters?: readonly CanvasExportContribution[];
  readonly diagnostics?: readonly string[];
  readonly modes?: readonly CanvasEditorModeTemplate[];
  readonly renderers?: readonly string[];
};

export function defineCanvasModules(modules: readonly CanvasModule[]): readonly CanvasModule[] {
  const seen = new Set<string>();
  return Object.freeze(
    modules.map((module) => {
      const id = module.id.trim();
      if (id.length === 0) throw new Error("Canvas module id must be non-empty.");
      if (seen.has(id)) throw new Error(`Duplicate canvas module id "${id}".`);
      seen.add(id);
      return Object.freeze({ ...module, id });
    }),
  );
}

export function collectModuleContributions<T>(
  modules: readonly CanvasModule[],
  select: (module: CanvasModule) => readonly T[] | undefined,
): readonly T[] {
  return modules.flatMap((module) => select(module) ?? []);
}
