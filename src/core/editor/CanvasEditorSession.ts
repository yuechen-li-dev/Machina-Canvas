import { type CanvasExportBundle, createCanvasExportBundle } from "../../canvasExport";
import { type CanvasViewport, createCanvasViewport } from "../../canvasViewport";
import { type CanvasEditorModeId, getCanvasEditorModeTemplate } from "../../editorModes";
import {
  applyExportPreset,
  CANVAS_EXPORT_PRESETS,
  type CanvasExportArtifact,
  type CanvasExportCart,
  collectCanvasExportArtifacts,
  createExportCart,
  reconcileExportCart,
  toggleExportArtifact,
} from "../../exportCart";
import {
  applyCanvasCommands,
  type CanvasCommand,
  type CanvasCommandApplyContext,
  type CanvasCommandApplyResult,
} from "../../sceneCommands";
import { getSceneGeometryDiagnostics } from "../../sceneGeometry";
import type { CanvasDocument } from "../../sceneModel";
import { summarizeScene } from "../../sceneSummary";
import { canvasTools } from "../../tools";
import { runCanvasTool } from "../../tools/registry";
import type { CanvasToolDefinition, CanvasToolInput, CanvasToolResult } from "../../tools/types";

export type CanvasEditorCommandLogEntry = {
  readonly id: string;
  readonly commands: readonly CanvasCommand[];
  readonly results: readonly CanvasCommandApplyResult[];
};

export type CanvasEditorSessionState = {
  readonly revision: number;
  readonly activeModeId?: CanvasEditorModeId;
  readonly document: CanvasDocument;
  readonly viewport: CanvasViewport;
  readonly lastCommand: string;
  readonly commandLog: readonly CanvasEditorCommandLogEntry[];
  readonly lastApplyResults: readonly CanvasCommandApplyResult[];
  readonly lastToolResult?: CanvasToolResult;
  readonly exportArtifacts: readonly CanvasExportArtifact[];
  readonly exportCart: CanvasExportCart;
  readonly exportBundle?: CanvasExportBundle;
};

export type CanvasEditorSessionOptions = {
  readonly document: CanvasDocument;
  readonly activeModeId?: CanvasEditorModeId;
  readonly commandOptions?: CanvasCommandApplyContext;
  readonly tools?: readonly CanvasToolDefinition[];
};

type Listener = () => void;

function collectArtifacts(
  document: CanvasDocument,
  activeModeId?: CanvasEditorModeId,
): readonly CanvasExportArtifact[] {
  return collectCanvasExportArtifacts({
    scene: document,
    activeModeId,
    selectedObjectId: document.selectedObjectId,
  });
}

/**
 * Framework-free semantic editor session. React is one possible observer; tests,
 * scripts, and future hosts can drive the same actions directly.
 */
export class CanvasEditorSession {
  readonly #listeners = new Set<Listener>();
  readonly #commandOptions?: CanvasCommandApplyContext;
  readonly #tools: readonly CanvasToolDefinition[];
  #commandSequence = 0;
  #state: CanvasEditorSessionState;

  constructor(options: CanvasEditorSessionOptions) {
    this.#commandOptions = options.commandOptions;
    this.#tools = options.tools ?? canvasTools;
    const exportArtifacts = collectArtifacts(options.document, options.activeModeId);
    this.#state = {
      revision: 0,
      activeModeId: options.activeModeId,
      document: options.document,
      viewport: createCanvasViewport(options.document),
      lastCommand: "ready",
      commandLog: [],
      lastApplyResults: [],
      exportArtifacts,
      exportCart: createExportCart(exportArtifacts),
    };
  }

  getSnapshot = (): CanvasEditorSessionState => this.#state;

  subscribe = (listener: Listener): (() => void) => {
    this.#listeners.add(listener);
    return () => this.#listeners.delete(listener);
  };

  switchMode(modeId: CanvasEditorModeId): CanvasEditorSessionState {
    const template = getCanvasEditorModeTemplate(modeId);
    const document = template.createScene();
    const selectedObjectId =
      template.defaultSelectedObjectId && document.objects[template.defaultSelectedObjectId]
        ? template.defaultSelectedObjectId
        : document.selectedObjectId;
    const resolvedDocument =
      selectedObjectId === document.selectedObjectId ? document : { ...document, selectedObjectId };
    const exportArtifacts = collectArtifacts(resolvedDocument, modeId);
    this.#commandSequence = 0;
    return this.#replace({
      activeModeId: modeId,
      document: resolvedDocument,
      viewport: createCanvasViewport(resolvedDocument),
      lastCommand: `mode ready: ${template.title}`,
      commandLog: [],
      lastApplyResults: [],
      lastToolResult: undefined,
      exportArtifacts,
      exportCart: createExportCart(exportArtifacts),
      exportBundle: undefined,
    });
  }

  replaceDocument(
    document: CanvasDocument,
    message = "document replaced",
  ): CanvasEditorSessionState {
    const exportArtifacts = collectArtifacts(document, this.#state.activeModeId);
    return this.#replace({
      document,
      viewport: createCanvasViewport(document),
      lastCommand: message,
      exportArtifacts,
      exportCart: reconcileExportCart(exportArtifacts, this.#state.exportCart),
      exportBundle: undefined,
    });
  }

  runCommand(
    command: CanvasCommand,
    commandOptions: CanvasCommandApplyContext | undefined = this.#commandOptions,
  ): CanvasEditorSessionState {
    return this.runCommands([command], commandOptions);
  }

  runCommands(
    commands: readonly CanvasCommand[],
    commandOptions: CanvasCommandApplyContext | undefined = this.#commandOptions,
  ): CanvasEditorSessionState {
    const applied = applyCanvasCommands(this.#state.document, commands, commandOptions);
    this.#commandSequence += 1;
    const exportArtifacts = collectArtifacts(applied.document, this.#state.activeModeId);
    return this.#replace({
      document: applied.document,
      lastCommand: `${commands.length} command${commands.length === 1 ? "" : "s"} applied`,
      commandLog: [
        {
          id: `command-${this.#commandSequence}`,
          commands: [...commands],
          results: [...applied.results],
        },
        ...this.#state.commandLog,
      ],
      lastApplyResults: [...applied.results],
      exportArtifacts,
      exportCart: reconcileExportCart(exportArtifacts, this.#state.exportCart),
      exportBundle: undefined,
    });
  }

  select(objectId: string | undefined): CanvasEditorSessionState {
    return this.runCommand({ kind: "select", id: objectId });
  }

  async runTool(toolId: string, input: CanvasToolInput = {}): Promise<CanvasEditorSessionState> {
    const result = await runCanvasTool(this.#tools, toolId, input, {
      document: this.#state.document,
    });
    let state = this.#state;
    if (result.document) {
      const exportArtifacts = collectArtifacts(result.document, this.#state.activeModeId);
      if (result.commands?.length && result.commandResults?.length) {
        this.#commandSequence += 1;
        state = this.#replace({
          document: result.document,
          commandLog: [
            {
              id: `command-${this.#commandSequence}`,
              commands: [...result.commands],
              results: [...result.commandResults],
            },
            ...this.#state.commandLog,
          ],
          lastApplyResults: [...result.commandResults],
          exportArtifacts,
          exportCart: reconcileExportCart(exportArtifacts, this.#state.exportCart),
          exportBundle: undefined,
        });
      } else {
        state = this.replaceDocument(result.document, `tool ${toolId} completed`);
      }
    } else if (result.commands?.length) {
      state = this.runCommands(result.commands);
    }
    return this.#replace({
      ...state,
      lastCommand: `tool ${toolId} completed`,
      lastToolResult: result,
    });
  }

  applyExportPreset(presetId: string): CanvasEditorSessionState {
    const preset = CANVAS_EXPORT_PRESETS.find((candidate) => candidate.id === presetId);
    if (!preset) throw new Error(`Unknown export preset "${presetId}".`);
    return this.#replace({
      exportCart: applyExportPreset(this.#state.exportArtifacts, preset),
      lastCommand: `export preset ${preset.title} selected`,
    });
  }

  toggleExportArtifact(artifactId: string): CanvasEditorSessionState {
    return this.#replace({
      exportCart: toggleExportArtifact(
        this.#state.exportCart,
        artifactId,
        this.#state.exportArtifacts,
      ),
      lastCommand: `export artifact ${artifactId} toggled`,
    });
  }

  createExportBundle(): CanvasEditorSessionState {
    const latestCommands = this.#state.commandLog[0]?.commands;
    const bundle = createCanvasExportBundle(this.#state.document, {
      selectedObjectId: this.#state.document.selectedObjectId,
      commands: latestCommands,
      summary: summarizeScene(this.#state.document),
      diagnostics: getSceneGeometryDiagnostics(this.#state.document),
      viewport: this.#state.viewport,
    });
    return this.#replace({
      exportBundle: bundle,
      lastCommand: "export generated",
    });
  }

  #replace(patch: Partial<CanvasEditorSessionState>): CanvasEditorSessionState {
    this.#state = {
      ...this.#state,
      ...patch,
      revision: this.#state.revision + 1,
    };
    for (const listener of this.#listeners) listener();
    return this.#state;
  }
}
