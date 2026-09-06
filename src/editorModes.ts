import { collectModuleContributions } from "./core/modules/types";
import { canvasModules } from "./modules";

export type {
  CanvasEditorModeId,
  CanvasEditorModeTemplate,
  CanvasToolGroupId,
} from "./core/modules/types";
import type { CanvasEditorModeId, CanvasEditorModeTemplate } from "./core/modules/types";

export const CANVAS_EDITOR_MODE_TEMPLATES: readonly CanvasEditorModeTemplate[] =
  collectModuleContributions(canvasModules, (module) => module.modes);

export function getCanvasEditorModeTemplate(id: CanvasEditorModeId): CanvasEditorModeTemplate {
  const template = CANVAS_EDITOR_MODE_TEMPLATES.find((candidate) => candidate.id === id);
  if (!template) throw new Error(`Unknown MachinaCanvas editor mode "${id}".`);
  return template;
}
