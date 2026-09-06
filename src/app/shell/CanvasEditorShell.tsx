import { MachinaReactView, type MachinaSlotProps } from "machinalayout/react";
import { matchKind } from "machinalayout/match";
import { type ComponentType, useCallback, useMemo, useRef, useState } from "react";
import { resolveAppLayout } from "../../appLayout";
import { CanvasModeStart } from "../../CanvasModeStart";
import {
  type CanvasTerminalLogEntry,
  type CanvasTerminalSideEffect,
  executeCanvasTerminalCommand,
} from "../../canvasCommandsTerminal";
import { type CanvasAidToggles, getDefaultCanvasAidToggles } from "../../canvasViewAids";
import {
  createCanvasViewport,
  fitCanvasViewport,
  setCanvasViewportZoom,
  viewportForGridRef,
  viewportForGridSpan,
  viewportForObject,
  viewportForSpriteFrame,
} from "../../canvasViewport";
import { CanvasEditorSession } from "../../core/editor/CanvasEditorSession";
import {
  type CanvasEditorModeId,
  type CanvasToolGroupId,
  getCanvasEditorModeTemplate,
} from "../../editorModes";
import {
  applyCanvasCommands,
  type CanvasCommand,
  type CanvasCommandApplyResult,
  type CanvasCommandValidationResult,
  createLayerGroup,
  validateCanvasCommands,
} from "../../sceneCommands";
import { getSceneGeometryDiagnostics } from "../../sceneGeometry";
import { DEFAULT_SPRITE_FRAME_DATUM_SNAP_DISTANCE } from "../../spriteGuideDatums";
import type { CanvasToolResult } from "../../tools";
import { CanvasEditorAsyncCoordinator } from "../async/CanvasEditorAsyncCoordinator";
import { browserExportService, browserFileService } from "../browser/BrowserEditorServices";
import { CanvasPanel } from "../canvas/CanvasPanel";
import {
  type AppViewData,
  type CommandLogEntry,
  exampleCommandJson,
  getDefaultImageLayerId,
  getOwnerImageForSelection,
  getSelectedObject,
  INITIAL_EDITOR_DOCUMENT,
  INITIAL_MODE_TEMPLATE,
  isToolGroupVisibleForMode,
  normalizeCommands,
  parseCommandJson,
  type SpriteFrameEditSettings,
  useRootRect,
} from "../editor/editorShared";
import {
  getSelectedSpriteFrameState,
  getSpriteCommandApplyContext,
  Inspector,
} from "../inspector/Inspector";
import { Breadcrumb, SceneSummaryShelf } from "./AuxiliaryViews";
import { SceneTree } from "./SceneTree";
import { useCanvasExportPresenter } from "./useCanvasExportPresenter";

export const VIEWS = {
  SceneTree,
  CanvasPanel,
  Inspector,
  SceneSummaryShelf,
  Breadcrumb,
} satisfies Record<string, ComponentType<MachinaSlotProps>>;

export function App() {
  const rootRect = useRootRect();
  const layout = useMemo(() => resolveAppLayout(rootRect), [rootRect]);
  const [activeModeId, setActiveModeId] = useState<CanvasEditorModeId | undefined>();
  const [document, setDocument] = useState(INITIAL_EDITOR_DOCUMENT);
  const [viewport, setViewport] = useState(() => createCanvasViewport(INITIAL_EDITOR_DOCUMENT));
  const [lastCommand, setLastCommand] = useState("ready");
  const [commandJson, setCommandJson] = useState(exampleCommandJson);
  const [commandValidation, setCommandValidation] = useState<
    CanvasCommandValidationResult | undefined
  >();
  const [commandLog, setCommandLog] = useState<CommandLogEntry[]>([]);
  const [commandLogCollapsed, setCommandLogCollapsed] = useState(false);
  const [terminalLog, setTerminalLog] = useState<CanvasTerminalLogEntry[]>([]);
  const [terminalCollapsed, setTerminalCollapsed] = useState(true);
  const [terminalInput, setTerminalInput] = useState("");
  const [aidToggles, setAidToggles] = useState<CanvasAidToggles>(getDefaultCanvasAidToggles());
  const [lastApplyResults, setLastApplyResults] = useState<CanvasCommandApplyResult[]>([]);
  const [lastToolResult, setLastToolResult] = useState<CanvasToolResult>();
  const [spriteFrameEditSettings, setSpriteFrameEditSettingsState] =
    useState<SpriteFrameEditSettings>({
      snapToGrid: false,
      gridSize: 1,
      constrainFrameEditsToGuideRegion: true,
      datumSnapDistance: DEFAULT_SPRITE_FRAME_DATUM_SNAP_DISTANCE,
      restrictDatumSnapsToGuideRegion: true,
    });
  const [editorSession] = useState(
    () => new CanvasEditorSession({ document: INITIAL_EDITOR_DOCUMENT }),
  );
  const [asyncCoordinator] = useState(
    () =>
      new CanvasEditorAsyncCoordinator({
        session: editorSession,
        files: browserFileService,
        exports: browserExportService,
      }),
  );
  const commandLogCounter = useRef(0);
  const geometryDiagnostics = useMemo(() => getSceneGeometryDiagnostics(document), [document]);
  const activeMode = activeModeId
    ? getCanvasEditorModeTemplate(activeModeId)
    : INITIAL_MODE_TEMPLATE;
  const selectedObject = getSelectedObject(document);
  const selectedSpriteFrame = getSelectedSpriteFrameState(document, selectedObject);
  const exportPresenter = useCanvasExportPresenter({
    coordinator: asyncCoordinator,
    document,
    viewport,
    commandLog,
    diagnostics: geometryDiagnostics,
    activeModeId,
    selectedSpriteFrameId: selectedSpriteFrame?.frame.id,
    setLastCommand,
  });
  const {
    exportArtifacts,
    exportCart,
    checkpointNote,
    lastCheckout,
    exportBundle,
    exportValidation,
    selectedExportPath,
    exportStatus,
    rasterScale,
    rasterBackground,
    rasterArtifact,
    rasterStatus,
  } = exportPresenter;

  const loadMode = (modeId: CanvasEditorModeId) => {
    const template = getCanvasEditorModeTemplate(modeId);
    const sessionState = editorSession.switchMode(modeId);
    const resolvedDocument = sessionState.document;

    setActiveModeId(modeId);
    setDocument(resolvedDocument);
    setViewport(createCanvasViewport(resolvedDocument));
    setLastCommand(`mode ready: ${template.title}`);
    setCommandJson(exampleCommandJson);
    setCommandValidation(undefined);
    setCommandLog([]);
    setCommandLogCollapsed(modeId === "sprites");
    setTerminalLog([]);
    setTerminalCollapsed(true);
    setTerminalInput("");
    setAidToggles(getDefaultCanvasAidToggles(modeId));
    setLastApplyResults([]);
    setLastToolResult(undefined);
    exportPresenter.reset(modeId, resolvedDocument);
    setSpriteFrameEditSettingsState({
      snapToGrid: false,
      gridSize: 1,
      constrainFrameEditsToGuideRegion: true,
      datumSnapDistance: DEFAULT_SPRITE_FRAME_DATUM_SNAP_DISTANCE,
      restrictDatumSnapsToGuideRegion: true,
    });
    commandLogCounter.current = 0;
  };

  const returnToModeSelection = useCallback(() => {
    const hasSessionState =
      commandLog.length > 0 ||
      exportBundle !== undefined ||
      exportValidation !== undefined ||
      rasterArtifact !== undefined;
    if (
      activeModeId !== undefined &&
      hasSessionState &&
      !window.confirm("Change mode and discard the current working scene?")
    ) {
      return;
    }
    setActiveModeId(undefined);
    setLastCommand("choose a canvas mode");
  }, [activeModeId, commandLog.length, exportBundle, exportValidation, rasterArtifact]);

  const viewData: AppViewData = (() => {
    const isToolGroupVisible = (group: CanvasToolGroupId) =>
      isToolGroupVisibleForMode(activeMode, group);
    const recordAppliedCommands = (
      commands: CanvasCommand[],
      results: CanvasCommandApplyResult[],
    ) => {
      commandLogCounter.current += 1;
      const logId = `command-${commandLogCounter.current}`;
      setLastApplyResults(results);
      setCommandLog((entries) => [
        {
          id: logId,
          timestamp: new Date().toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
          }),
          commands,
          results,
        },
        ...entries,
      ]);
      setLastCommand(`${commands.length} command${commands.length === 1 ? "" : "s"} applied`);
    };

    const runCommands = (commands: CanvasCommand[]) => {
      editorSession.replaceDocument(document, "React view synchronized");
      const sessionState = editorSession.runCommands(
        commands,
        getSpriteCommandApplyContext(spriteFrameEditSettings),
      );
      setDocument(sessionState.document);
      recordAppliedCommands(commands, [...sessionState.lastApplyResults]);
    };

    const runCommand = (command: CanvasCommand) => {
      runCommands([command]);
    };

    const applyCartPreset = exportPresenter.applyPreset;
    const toggleCartArtifact = exportPresenter.toggleArtifact;
    const runCartCheckout = exportPresenter.checkout;
    const saveCheckpoint = exportPresenter.saveCheckpoint;

    const applyTerminalSideEffect = (sideEffect: CanvasTerminalSideEffect) => {
      matchKind(sideEffect, {
        applyExportPreset: ({ presetId }) => applyCartPreset(presetId),
        setExportArtifactSelected: ({ artifactId, selected }) => {
          const isSelected = exportCart.selectedArtifactIds.includes(artifactId);
          if (isSelected !== selected) toggleCartArtifact(artifactId);
        },
        checkoutExportCart: () => void runCartCheckout(),
        saveCheckpoint: ({ message }) => void saveCheckpoint(message),
      });
    };

    const runTerminalCommand = (input: string) => {
      const result = executeCanvasTerminalCommand(input, {
        document,
        exportArtifacts,
        exportCart,
        exportPresets: exportPresenter.exportPresets,
      });
      if (result.clearLog) {
        setTerminalLog([]);
        setTerminalInput("");
        setLastCommand("terminal log cleared");
        return;
      }
      if (result.commands?.length) {
        runCommands(result.commands);
      }
      if (result.sideEffects?.length) {
        for (const sideEffect of result.sideEffects) {
          applyTerminalSideEffect(sideEffect);
        }
      }
      const logEntry = result.logEntry;
      if (logEntry) {
        setTerminalLog((entries) => [logEntry, ...entries].slice(0, 50));
        setLastCommand(logEntry.message);
      }
      setTerminalInput("");
    };

    const runCanvasTool: AppViewData["runCanvasTool"] = async (toolId, input) => {
      try {
        editorSession.replaceDocument(document, "React view synchronized");
        const sessionState = await editorSession.runTool(toolId, input);
        const result = sessionState.lastToolResult;
        if (!result) throw new Error(`Tool ${toolId} did not return a result.`);
        setLastToolResult(result);
        setDocument(sessionState.document);
        if (result.commands?.length) {
          recordAppliedCommands([...result.commands], [...sessionState.lastApplyResults]);
        }
        setLastCommand(`tool ${toolId} completed`);
      } catch (caught) {
        const message = caught instanceof Error ? caught.message : `Tool ${toolId} failed.`;
        setLastCommand(message);
        setLastToolResult({
          toolId,
          notes: [message],
        });
      }
    };

    const createLayerGroupFromPanel = (title: string) => {
      const nextTitle = title.trim() || "New group";
      setDocument((current) => createLayerGroup(current, nextTitle));
      setLastCommand(`created layer group ${nextTitle}`);
    };

    const applyCoordinatorDocument = (
      result: Awaited<ReturnType<CanvasEditorAsyncCoordinator["loadImage"]>>,
    ) => {
      matchKind(result, {
        err: ({ error }) => setLastCommand(error),
        ok: ({ value, message }) => {
          setDocument(value.document);
          if (value.validation) setCommandValidation(value.validation);
          if (value.commands?.length && value.commandResults) {
            recordAppliedCommands([...value.commands], [...value.commandResults]);
          } else {
            setLastCommand(message);
          }
        },
      });
    };

    const getLoadContext = (targetId?: string, groupId?: string) => ({
      document,
      layerId: getDefaultImageLayerId(document),
      targetId,
      groupId,
      commandOptions: getSpriteCommandApplyContext(spriteFrameEditSettings),
    });

    const createMechanicalAnnotationsSidecar: AppViewData["createMechanicalAnnotationsSidecar"] =
      async (options) => {
        const selected = getSelectedObject(document);
        applyCoordinatorDocument(
          await asyncCoordinator.createMechanicalSidecar({
            ...getLoadContext(options?.targetObjectId ?? selected?.id, options?.groupId),
            useDefaultSheet: activeModeId === "mechanical",
          }),
        );
      };

    const loadImageFile: AppViewData["loadImageFile"] = async (file, options) => {
      applyCoordinatorDocument(
        await asyncCoordinator.loadImage(file, {
          ...getLoadContext(undefined, options?.groupId),
          role: options?.role ?? "image",
          attachToImageId: options?.attachToImageId,
        }),
      );
    };

    const getImageTargetId = (explicitTargetId?: string) => {
      if (explicitTargetId) return explicitTargetId;
      return getOwnerImageForSelection(document, getSelectedObject(document))?.id;
    };

    const loadSpriteSidecarFile: AppViewData["loadSpriteSidecarFile"] = async (file, options) => {
      applyCoordinatorDocument(
        await asyncCoordinator.loadSpriteSidecar(
          file,
          getLoadContext(getImageTargetId(options?.targetId), options?.groupId),
        ),
      );
    };

    const loadGuideSidecarFile: AppViewData["loadGuideSidecarFile"] = async (file, options) => {
      applyCoordinatorDocument(
        await asyncCoordinator.loadGuideSidecar(
          file,
          getLoadContext(getImageTargetId(options?.targetId), options?.groupId),
        ),
      );
    };

    const loadBlockoutSidecarFile: AppViewData["loadBlockoutSidecarFile"] = async (
      file,
      options,
    ) => {
      applyCoordinatorDocument(
        await asyncCoordinator.loadBlockoutSidecar(
          file,
          getLoadContext(
            options?.targetObjectId ?? getSelectedObject(document)?.id,
            options?.groupId,
          ),
        ),
      );
    };

    const loadSketchOverlayFile: AppViewData["loadSketchOverlayFile"] = async (file, options) => {
      applyCoordinatorDocument(
        await asyncCoordinator.loadSketchOverlay(
          file,
          getLoadContext(getImageTargetId(options?.targetId), options?.groupId),
        ),
      );
    };

    const setAidToggle = (key: keyof CanvasAidToggles, value: boolean) => {
      setAidToggles((current) => ({ ...current, [key]: value }));
    };

    const setSpriteFrameEditSettings = (settings: SpriteFrameEditSettings) => {
      setSpriteFrameEditSettingsState(settings);
    };

    const fitViewport = () => {
      setViewport(fitCanvasViewport(document));
      setLastCommand("viewport fit to canvas");
    };

    const setZoom = (zoom: number) => {
      setViewport((current) => setCanvasViewportZoom(current, zoom));
      setLastCommand(
        `viewport zoom ${Math.round(setCanvasViewportZoom(viewport, zoom).zoom * 100)}%`,
      );
    };

    const zoomToSelected = () => {
      if (!document.selectedObjectId) return;
      const selected = getSelectedObject(document);
      const selectedFrame = getSelectedSpriteFrameState(document, selected);
      if (selectedFrame?.image) {
        setViewport(
          viewportForSpriteFrame(document, selectedFrame.image, {
            sidecarId: selectedFrame.sidecar.id,
            frame: selectedFrame.frame,
          }),
        );
        setLastCommand(`viewport zoomed to sprite frame ${selectedFrame.frame.id}`);
        return;
      }
      setViewport(viewportForObject(document, document.selectedObjectId));
      setLastCommand(`viewport zoomed to ${document.selectedObjectId}`);
    };

    const zoomToGridRef = (ref: string) => {
      setViewport(viewportForGridRef(document, ref));
      setLastCommand(`viewport zoomed to ${ref.trim()}`);
    };

    const zoomToGridSpan = (span: string) => {
      setViewport(viewportForGridSpan(document, span));
      setLastCommand(`viewport zoomed to ${span.trim()}`);
    };

    const loadExampleCommands = () => {
      setCommandJson(exampleCommandJson);
      setCommandValidation(undefined);
      setLastCommand("example command JSON loaded");
    };

    const validateCommandJson = () => {
      const parsed = parseCommandJson(commandJson);
      if (!parsed.ok) {
        setCommandValidation(parsed.validation);
        setLastCommand("command JSON invalid");
        return;
      }

      const validation = validateCanvasCommands(document, parsed.value);
      setCommandValidation(validation);
      setLastCommand(validation.ok ? "command JSON valid" : "command JSON invalid");
    };

    const applyCommandJson = () => {
      const parsed = parseCommandJson(commandJson);
      if (!parsed.ok) {
        setCommandValidation(parsed.validation);
        setLastCommand("command JSON invalid");
        return;
      }

      const validation = validateCanvasCommands(document, parsed.value);
      setCommandValidation(validation);
      if (!validation.ok) {
        setLastCommand("command JSON invalid");
        return;
      }

      const commands = normalizeCommands(parsed.value);
      const applyResult = applyCanvasCommands(
        document,
        commands,
        getSpriteCommandApplyContext(spriteFrameEditSettings),
      );
      setDocument(applyResult.document);
      recordAppliedCommands(commands, applyResult.results);
    };

    const generateExport = exportPresenter.generateExport;
    const generateTsxExport = exportPresenter.generateTsxExport;
    const setRasterScale = exportPresenter.setRasterScale;
    const setRasterBackground = exportPresenter.setRasterBackground;
    const generatePngExport = exportPresenter.generatePng;
    const selectExportFile = exportPresenter.selectExportFile;
    const copySelectedExportFile = exportPresenter.copySelected;
    const copyValidationReport = exportPresenter.copyValidation;
    const downloadSelectedExportFile = exportPresenter.downloadSelected;
    const downloadRasterArtifact = exportPresenter.downloadRaster;

    return {
      activeMode,
      document,
      viewport,
      aidToggles,
      lastCommand,
      commandJson,
      commandValidation,
      commandLog,
      commandLogCollapsed,
      lastApplyResults,
      terminalLog,
      terminalCollapsed,
      terminalInput,
      spriteFrameEditSettings,
      lastToolResult,
      geometryDiagnostics,
      exportArtifacts,
      exportCart,
      exportPresets: exportPresenter.exportPresets,
      checkpointNote,
      lastCheckout,
      exportBundle,
      exportValidation,
      selectedExportPath,
      exportStatus,
      rasterScale,
      rasterBackground,
      rasterArtifact,
      rasterStatus,
      isToolGroupVisible,
      returnToModeSelection,
      setViewport,
      setAidToggle,
      fitViewport,
      setZoom,
      zoomToSelected,
      zoomToGridRef,
      zoomToGridSpan,
      runCommand,
      runCommands,
      runTerminalCommand,
      setCommandLogCollapsed,
      setTerminalCollapsed,
      setSpriteFrameEditSettings,
      setTerminalInput,
      runCanvasTool,
      createLayerGroup: createLayerGroupFromPanel,
      loadImageFile,
      loadGuideSidecarFile,
      loadBlockoutSidecarFile,
      createMechanicalAnnotationsSidecar,
      loadSketchOverlayFile,
      loadSpriteSidecarFile,
      setCommandJson,
      loadExampleCommands,
      validateCommandJson,
      applyCommandJson,
      generateExport,
      generateTsxExport,
      applyExportPreset: applyCartPreset,
      toggleExportArtifact: toggleCartArtifact,
      checkoutExportCart: runCartCheckout,
      saveCheckpoint,
      setCheckpointNote: exportPresenter.setCheckpointNote,
      setRasterScale,
      setRasterBackground,
      generatePngExport,
      selectExportFile,
      copySelectedExportFile,
      copyValidationReport,
      downloadSelectedExportFile,
      downloadRasterArtifact,
    };
  })();

  if (activeModeId === undefined) {
    return <CanvasModeStart onSelectMode={loadMode} />;
  }

  return (
    <MachinaReactView
      layout={layout}
      views={VIEWS}
      viewData={{
        SceneTree: viewData,
        CanvasPanel: viewData,
        Inspector: viewData,
        SceneSummaryShelf: viewData,
        Breadcrumb: viewData,
      }}
      className="machina-canvas"
      nodeClassName="machina-node"
      nodeContainment="layout-paint"
      nodeContentVisibility="none"
    />
  );
}
