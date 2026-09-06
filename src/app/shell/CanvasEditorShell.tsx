import { MachinaReactView, type MachinaSlotProps } from "machinalayout/react";
import { matchKind } from "machinalayout/match";
import { type ComponentType, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { resolveAppLayout } from "../../appLayout";
import {
  createBlockoutSidecarObject,
  createUnattachedBlockoutSidecarObject,
  parseBlockoutSidecarToml,
} from "../../blockoutSidecar";
import { CanvasModeStart } from "../../CanvasModeStart";
import {
  type CanvasTerminalLogEntry,
  type CanvasTerminalSideEffect,
  executeCanvasTerminalCommand,
} from "../../canvasCommandsTerminal";
import { type CanvasExportBundle, createCanvasExportBundle } from "../../canvasExport";
import {
  type CanvasExportValidationResult,
  formatCanvasExportValidationReport,
  validateCanvasExportBundle,
} from "../../canvasExportValidation";
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
  applyExportPreset,
  CANVAS_EXPORT_PRESETS,
  type CanvasExportCart,
  type CanvasExportCheckoutResult,
  checkoutExportCart,
  collectCanvasExportArtifacts,
  createCanvasCheckpointArtifact,
  createExportCart,
  reconcileExportCart,
  toggleExportArtifact,
} from "../../exportCart";
import {
  createGuideSidecarObject,
  createUnattachedGuideSidecarObject,
  parseGuideSidecarToml,
} from "../../guideSidecar";
import { createImageObjectFromAsset, makeUniqueObjectId } from "../../imageAssets";
import {
  createDefaultMechanicalSheetMetadata,
  createMechanicalAnnotationSet,
  createMechanicalAnnotationSidecarObject,
} from "../../mechanicalAnnotations";
import {
  getRasterExportFileName,
  lowerCanvasDocumentToRasterBlob,
  type NormalizedRasterExportOptions,
  normalizeRasterExportOptions,
  type RasterExportBackground,
} from "../../rasterExport";
import {
  addObjectToLayerGroup,
  applyCanvasCommands,
  attachAlphaMapToImage,
  attachGuideSidecarToImage,
  attachSketchOverlayToImage,
  attachSpriteSidecarToImage,
  type CanvasCommand,
  type CanvasCommandApplyResult,
  type CanvasCommandValidationResult,
  createLayerGroup,
  validateCanvasCommands,
} from "../../sceneCommands";
import { getSceneGeometryDiagnostics } from "../../sceneGeometry";
import type { CanvasDocument } from "../../sceneModel";
import { summarizeScene } from "../../sceneSummary";
import { createSketchOverlayObject, parseSketchOverlayToml } from "../../sketchOverlay";
import { DEFAULT_SPRITE_FRAME_DATUM_SNAP_DISTANCE } from "../../spriteGuideDatums";
import {
  createSpriteSidecarObject,
  createUnattachedSpriteSidecarObject,
  parseSpriteSidecarToml,
} from "../../spriteSidecar";
import type { CanvasToolResult } from "../../tools";
import { CanvasPanel } from "../canvas/CanvasPanel";
import {
  type AppViewData,
  type CommandLogEntry,
  exampleCommandJson,
  getDefaultImageLayerId,
  getOwnerImageForSelection,
  getSelectedExportFile,
  getSelectedObject,
  INITIAL_EDITOR_DOCUMENT,
  INITIAL_MODE_TEMPLATE,
  isToolGroupVisibleForMode,
  normalizeCommands,
  parseCommandJson,
  type RasterExportArtifact,
  type SpriteFrameEditSettings,
  useRootRect,
} from "../editor/editorShared";
import { readCanvasImageFile, readCanvasTextFile } from "../files/browserFileLoading";
import {
  getSelectedSpriteFrameState,
  getSpriteCommandApplyContext,
  Inspector,
} from "../inspector/Inspector";
import { Breadcrumb, SceneSummaryShelf } from "./AuxiliaryViews";
import { SceneTree } from "./SceneTree";

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
  const [exportCart, setExportCart] = useState<CanvasExportCart>({
    selectedArtifactIds: [],
    checkoutMode: "downloadFiles",
  });
  const [checkpointNote, setCheckpointNote] = useState("");
  const [lastCheckout, setLastCheckout] = useState<CanvasExportCheckoutResult>();
  const [exportBundle, setExportBundle] = useState<CanvasExportBundle>();
  const [exportValidation, setExportValidation] = useState<CanvasExportValidationResult>();
  const [selectedExportPath, setSelectedExportPath] = useState<string>();
  const [exportStatus, setExportStatus] = useState("");
  const [rasterScale, setRasterScaleState] = useState(1);
  const [rasterBackground, setRasterBackgroundState] =
    useState<RasterExportBackground>("transparent");
  const [spriteFrameEditSettings, setSpriteFrameEditSettingsState] =
    useState<SpriteFrameEditSettings>({
      snapToGrid: false,
      gridSize: 1,
      constrainFrameEditsToGuideRegion: true,
      datumSnapDistance: DEFAULT_SPRITE_FRAME_DATUM_SNAP_DISTANCE,
      restrictDatumSnapsToGuideRegion: true,
    });
  const [rasterArtifact, setRasterArtifact] = useState<RasterExportArtifact>();
  const [rasterStatus, setRasterStatus] = useState("");
  const [editorSession] = useState(
    () => new CanvasEditorSession({ document: INITIAL_EDITOR_DOCUMENT }),
  );
  const commandLogCounter = useRef(0);
  const geometryDiagnostics = useMemo(() => getSceneGeometryDiagnostics(document), [document]);
  const activeMode = activeModeId
    ? getCanvasEditorModeTemplate(activeModeId)
    : INITIAL_MODE_TEMPLATE;
  const selectedObject = getSelectedObject(document);
  const selectedSpriteFrame = getSelectedSpriteFrameState(document, selectedObject);
  const exportArtifacts = useMemo(
    () =>
      collectCanvasExportArtifacts({
        scene: document,
        activeModeId,
        selectedObjectId: document.selectedObjectId,
        selectedSpriteFrameId: selectedSpriteFrame?.frame.id,
      }),
    [activeModeId, document, selectedSpriteFrame?.frame.id],
  );

  useEffect(() => {
    setExportCart((current) => reconcileExportCart(exportArtifacts, current));
  }, [exportArtifacts]);

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
    setExportCart(
      createExportCart(
        collectCanvasExportArtifacts({
          scene: resolvedDocument,
          activeModeId: modeId,
          selectedObjectId: resolvedDocument.selectedObjectId,
        }),
      ),
    );
    setCheckpointNote("");
    setLastCheckout(undefined);
    setExportBundle(undefined);
    setExportValidation(undefined);
    setSelectedExportPath(undefined);
    setExportStatus("");
    setRasterScaleState(1);
    setRasterBackgroundState("transparent");
    setSpriteFrameEditSettingsState({
      snapToGrid: false,
      gridSize: 1,
      constrainFrameEditsToGuideRegion: true,
      datumSnapDistance: DEFAULT_SPRITE_FRAME_DATUM_SNAP_DISTANCE,
      restrictDatumSnapsToGuideRegion: true,
    });
    setRasterArtifact(undefined);
    setRasterStatus("");
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

  const viewData = useMemo<AppViewData>(() => {
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

    const setCheckpointNoteValue = (value: string) => {
      setCheckpointNote(value);
    };

    const applyCartPreset = (presetId: string) => {
      const preset = CANVAS_EXPORT_PRESETS.find((candidate) => candidate.id === presetId);
      if (!preset) {
        setExportStatus(`Unknown export preset "${presetId}".`);
        return;
      }
      setExportCart(applyExportPreset(exportArtifacts, preset));
      setExportStatus(`Preset ${preset.title} selected.`);
    };

    const toggleCartArtifact = (artifactId: string) => {
      setExportCart((current) => toggleExportArtifact(current, artifactId, exportArtifacts));
    };

    const saveCheckpoint = async (message?: string) => {
      const artifact = createCanvasCheckpointArtifact({
        scene: document,
        activeModeId,
        selectedObjectId: document.selectedObjectId,
        selectedSpriteFrameId: selectedSpriteFrame?.frame.id,
        message: message ?? (checkpointNote.trim() || undefined),
      });
      const result = await checkoutExportCart({
        artifacts: [artifact],
        cart: {
          selectedArtifactIds: [artifact.id],
          checkoutMode: "downloadFiles",
        },
        activeModeId,
      });
      setLastCheckout(result);
      if (result.kind === "ok") {
        setExportStatus(`Checkpoint saved as ${artifact.filename}.`);
        setCheckpointNote("");
        setLastCommand("checkpoint saved");
      } else {
        setExportStatus(`Checkpoint failed: ${result.message}`);
        setLastCommand("checkpoint failed");
      }
    };

    const runCartCheckout = async () => {
      const result = await checkoutExportCart({
        artifacts: exportArtifacts,
        cart: exportCart,
        activeModeId,
      });
      setLastCheckout(result);
      if (result.kind === "ok") {
        setExportStatus(
          `Checked out ${result.artifactCount} file${result.artifactCount === 1 ? "" : "s"}: ${result.filenames.join(", ")}`,
        );
        setLastCommand("export checkout completed");
      } else {
        setExportStatus(
          `Checkout failed${result.failedArtifactId ? ` on ${result.failedArtifactId}` : ""}: ${result.message}`,
        );
        setLastCommand("export checkout failed");
      }
    };

    const applyTerminalSideEffect = (sideEffect: CanvasTerminalSideEffect) => {
      matchKind(sideEffect, {
        applyExportPreset: ({ presetId }) => applyCartPreset(presetId),
        setExportArtifactSelected: ({ artifactId, selected }) =>
          setExportCart((current) => {
            const isSelected = current.selectedArtifactIds.includes(artifactId);
            if (isSelected === selected) return current;
            return toggleExportArtifact(current, artifactId, exportArtifacts);
          }),
        checkoutExportCart: () => void runCartCheckout(),
        saveCheckpoint: ({ message }) => void saveCheckpoint(message),
      });
    };

    const runTerminalCommand = (input: string) => {
      const result = executeCanvasTerminalCommand(input, {
        document,
        exportArtifacts,
        exportCart,
        exportPresets: CANVAS_EXPORT_PRESETS,
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

    const createMechanicalAnnotationsSidecar: AppViewData["createMechanicalAnnotationsSidecar"] =
      async (options) => {
        try {
          const selected = getSelectedObject(document);
          const targetObjectId = options?.targetObjectId ?? selected?.id;
          const target = targetObjectId ? document.objects[targetObjectId] : undefined;
          const layerId = target?.layerId ?? getDefaultImageLayerId(document);
          const sidecarId = makeUniqueObjectId("mechanical-annotations", document);
          const geometryBounds = target
            ? {
                x: target.x,
                y: target.y,
                width: target.width,
                height: target.height,
              }
            : { x: 0, y: 0, width: document.width, height: document.height };
          const annotationUnits =
            document.unit === "mm" ||
            document.unit === "cm" ||
            document.unit === "in" ||
            document.unit === "px"
              ? document.unit
              : "px";
          const sidecar = createMechanicalAnnotationSidecarObject({
            id: sidecarId,
            name: "Mechanical annotations",
            layerId,
            x: geometryBounds.x,
            y: geometryBounds.y,
            width: geometryBounds.width,
            height: geometryBounds.height,
            targetObjectId,
            annotations: createMechanicalAnnotationSet({
              id: `${sidecarId}-set`,
              units: annotationUnits,
              sheet:
                activeModeId === "mechanical" ? createDefaultMechanicalSheetMetadata() : undefined,
            }),
          });
          let nextDocument: CanvasDocument = {
            ...document,
            selectedObjectId: sidecar.id,
            objects: {
              ...document.objects,
              [sidecar.id]: sidecar,
            },
            layers: document.layers.map((layer) =>
              layer.id === sidecar.layerId
                ? { ...layer, objectIds: [...layer.objectIds, sidecar.id] }
                : layer,
            ),
          };
          if (options?.groupId) {
            nextDocument = addObjectToLayerGroup(nextDocument, options.groupId, sidecar.id);
          }
          setDocument(nextDocument);
          setLastCommand(`created ${sidecar.name.toLowerCase()}`);
        } catch (caught) {
          setLastCommand(
            caught instanceof Error
              ? caught.message
              : "Mechanical annotations could not be created.",
          );
        }
      };

    const loadImageFile: AppViewData["loadImageFile"] = async (file, options) => {
      try {
        const role = options?.role ?? "image";
        const asset = await readCanvasImageFile(file, {
          idPrefix: role === "image" ? "image-" : "alpha-",
        });
        const objectId = makeUniqueObjectId(asset.id, document);
        const object = createImageObjectFromAsset(asset, {
          id: objectId,
          layerId: getDefaultImageLayerId(document),
          role,
          document,
        });
        const command: CanvasCommand = { kind: "addImageObject", object };
        const validation = validateCanvasCommands(document, command);
        setCommandValidation(validation);
        if (!validation.ok) {
          setLastCommand("image asset command invalid");
          return;
        }

        let nextDocument = applyCanvasCommands(
          document,
          [command],
          getSpriteCommandApplyContext(spriteFrameEditSettings),
        ).document;
        if (options?.groupId) {
          nextDocument = addObjectToLayerGroup(nextDocument, options.groupId, object.id);
        }
        if (role === "alphaMap" && options?.attachToImageId) {
          nextDocument = attachAlphaMapToImage(nextDocument, options.attachToImageId, object.id);
        }
        setDocument(nextDocument);
        const applyResult = applyCanvasCommands(
          document,
          [command],
          getSpriteCommandApplyContext(spriteFrameEditSettings),
        );
        recordAppliedCommands([command], applyResult.results);
      } catch (caught) {
        setLastCommand(
          caught instanceof Error ? caught.message : "Image file could not be loaded.",
        );
      }
    };

    const loadSpriteSidecarFile: AppViewData["loadSpriteSidecarFile"] = async (file, options) => {
      try {
        const selected = getOwnerImageForSelection(document, getSelectedObject(document));
        const target =
          (options?.targetId ? document.objects[options.targetId] : selected) ?? undefined;
        const targetImage =
          target?.kind === "image" && (target.role === undefined || target.role === "image")
            ? target
            : undefined;

        const { text } = await readCanvasTextFile(file);
        const baseName = file.name.replace(/\.(spriteforge|sprite)?\.?toml$/i, "");
        const sidecarId = makeUniqueObjectId(
          `${(targetImage?.id ?? baseName) || "sprite-sidecar"}-sprite-sidecar`,
          document,
        );
        const spec = parseSpriteSidecarToml(text, {
          id: sidecarId,
          name: `${baseName || targetImage?.name || file.name} sprite sidecar`,
          targetId: targetImage?.id,
          sourceName: file.name,
        });
        const object = targetImage
          ? createSpriteSidecarObject(targetImage, spec)
          : createUnattachedSpriteSidecarObject(spec, {
              layerId: getDefaultImageLayerId(document),
            });
        const command: CanvasCommand = {
          kind: "addSpriteSidecarObject",
          object,
          attach: Boolean(targetImage),
        };
        const validation = validateCanvasCommands(document, command);
        setCommandValidation(validation);
        if (!validation.ok) {
          setLastCommand("sprite sidecar command invalid");
          return;
        }

        const applyResult = applyCanvasCommands(
          document,
          [command],
          getSpriteCommandApplyContext(spriteFrameEditSettings),
        );
        let nextDocument = applyResult.document;
        if (options?.groupId) {
          nextDocument = addObjectToLayerGroup(nextDocument, options.groupId, object.id);
        }
        if (targetImage) {
          nextDocument = attachSpriteSidecarToImage(nextDocument, targetImage.id, object.id);
        }
        setDocument(nextDocument);
        recordAppliedCommands([command], applyResult.results);
      } catch (caught) {
        setLastCommand(
          caught instanceof Error ? caught.message : "Sprite sidecar could not be loaded.",
        );
      }
    };

    const loadGuideSidecarFile: AppViewData["loadGuideSidecarFile"] = async (file, options) => {
      try {
        const selected = getOwnerImageForSelection(document, getSelectedObject(document));
        const target =
          (options?.targetId ? document.objects[options.targetId] : selected) ?? undefined;
        const targetImage =
          target?.kind === "image" && (target.role === undefined || target.role === "image")
            ? target
            : undefined;

        const { text } = await readCanvasTextFile(file);
        const baseName = file.name.replace(/\.guide\.toml$/i, "").replace(/\.toml$/i, "");
        const guideId = makeUniqueObjectId(
          `${(targetImage?.id ?? baseName) || "guide-sidecar"}-guide-sidecar`,
          document,
        );
        const guide = parseGuideSidecarToml(text);
        const name = `${baseName || targetImage?.name || file.name}.guide.toml`;
        const object = targetImage
          ? createGuideSidecarObject(
              targetImage,
              { ...guide, id: guideId, rawToml: text },
              { name },
            )
          : createUnattachedGuideSidecarObject(
              { ...guide, id: guideId, rawToml: text },
              {
                layerId: getDefaultImageLayerId(document),
                name,
              },
            );
        const command: CanvasCommand = {
          kind: "addGuideSidecarObject",
          object,
          attach: Boolean(targetImage),
        };
        const validation = validateCanvasCommands(document, command);
        setCommandValidation(validation);
        if (!validation.ok) {
          setLastCommand("guide sidecar command invalid");
          return;
        }

        const applyResult = applyCanvasCommands(
          document,
          [command],
          getSpriteCommandApplyContext(spriteFrameEditSettings),
        );
        let nextDocument = applyResult.document;
        if (options?.groupId) {
          nextDocument = addObjectToLayerGroup(nextDocument, options.groupId, object.id);
        }
        if (targetImage) {
          nextDocument = attachGuideSidecarToImage(nextDocument, targetImage.id, object.id);
        }
        setDocument(nextDocument);
        recordAppliedCommands([command], applyResult.results);
      } catch (caught) {
        setLastCommand(
          caught instanceof Error ? caught.message : "Guide sidecar could not be loaded.",
        );
      }
    };

    const loadBlockoutSidecarFile: AppViewData["loadBlockoutSidecarFile"] = async (
      file,
      options,
    ) => {
      try {
        const selectedObject = getSelectedObject(document);
        const targetObject =
          (options?.targetObjectId ? document.objects[options.targetObjectId] : selectedObject) ??
          undefined;
        const { text } = await readCanvasTextFile(file);
        const baseName = file.name.replace(/\.blockout\.toml$/i, "").replace(/\.toml$/i, "");
        const blockoutId = makeUniqueObjectId(
          `${(targetObject?.id ?? baseName) || "blockout-sidecar"}-blockout-sidecar`,
          document,
        );
        const blockout = parseBlockoutSidecarToml(text);
        const name = `${baseName || targetObject?.name || file.name}.blockout.toml`;
        const object = targetObject
          ? createBlockoutSidecarObject(
              targetObject,
              { ...blockout, id: blockoutId, rawToml: text },
              { name },
            )
          : createUnattachedBlockoutSidecarObject(
              { ...blockout, id: blockoutId, rawToml: text },
              {
                layerId: getDefaultImageLayerId(document),
                name,
              },
            );
        const command: CanvasCommand = {
          kind: "addBlockoutSidecarObject",
          object,
          attach: Boolean(targetObject),
        };
        const validation = validateCanvasCommands(document, command);
        setCommandValidation(validation);
        if (!validation.ok) {
          setLastCommand("blockout sidecar command invalid");
          return;
        }

        const applyResult = applyCanvasCommands(
          document,
          [command],
          getSpriteCommandApplyContext(spriteFrameEditSettings),
        );
        let nextDocument = applyResult.document;
        if (options?.groupId) {
          nextDocument = addObjectToLayerGroup(nextDocument, options.groupId, object.id);
        }
        if (targetObject) {
          nextDocument = applyCanvasCommands(
            nextDocument,
            [
              {
                kind: "attachBlockoutSidecar",
                targetObjectId: targetObject.id,
                blockoutId: object.id,
              },
            ],
            getSpriteCommandApplyContext(spriteFrameEditSettings),
          ).document;
        }
        setDocument(nextDocument);
        recordAppliedCommands([command], applyResult.results);
      } catch (caught) {
        setLastCommand(
          caught instanceof Error ? caught.message : "Blockout sidecar could not be loaded.",
        );
      }
    };

    const loadSketchOverlayFile: AppViewData["loadSketchOverlayFile"] = async (file, options) => {
      try {
        const selected = getOwnerImageForSelection(document, getSelectedObject(document));
        const target =
          (options?.targetId ? document.objects[options.targetId] : selected) ?? undefined;
        const targetImage =
          target?.kind === "image" && (target.role === undefined || target.role === "image")
            ? target
            : undefined;
        const { text } = await readCanvasTextFile(file);
        const baseName = file.name.replace(/\.sketch\.toml$/i, "").replace(/\.toml$/i, "");
        const overlayId = makeUniqueObjectId(
          `${(targetImage?.id ?? baseName) || "sketch-overlay"}-sketch`,
          document,
        );
        const spec = parseSketchOverlayToml(text, {
          id: overlayId,
          name: baseName || "Sketch overlay",
          targetId: targetImage?.id,
        });
        const object = createSketchOverlayObject(spec, {
          id: overlayId,
          name: spec.name,
          target: targetImage,
          layerId: getDefaultImageLayerId(document),
        });
        const nextObjects = {
          ...document.objects,
          [object.id]: object,
        };
        const nextLayers = document.layers.map((layer) =>
          layer.id === object.layerId && !layer.objectIds.includes(object.id)
            ? { ...layer, objectIds: [...layer.objectIds, object.id] }
            : layer,
        );
        let nextDocument: CanvasDocument = {
          ...document,
          objects: nextObjects,
          layers: nextLayers,
          selectedObjectId: object.id,
        };
        if (options?.groupId) {
          nextDocument = addObjectToLayerGroup(nextDocument, options.groupId, object.id);
        }
        if (targetImage) {
          nextDocument = attachSketchOverlayToImage(nextDocument, targetImage.id, object.id);
        }
        setDocument(nextDocument);
        setLastCommand(`loaded sketch overlay ${file.name}`);
      } catch (caught) {
        setLastCommand(
          caught instanceof Error ? caught.message : "Sketch overlay could not be loaded.",
        );
      }
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

    const generateExport = () => {
      const latestCommands = commandLog[0]?.commands;
      const bundle = createCanvasExportBundle(document, {
        selectedObjectId: document.selectedObjectId,
        commands: latestCommands,
        summary: summarizeScene(document),
        diagnostics: geometryDiagnostics,
        viewport,
      });
      const validation = validateCanvasExportBundle(bundle, {
        expectedCommands: latestCommands !== undefined,
      });
      setExportBundle(bundle);
      setExportValidation(validation);
      setRasterArtifact(undefined);
      setRasterStatus("");
      setSelectedExportPath("handoff.toml");
      setExportStatus(
        `${bundle.files.length} files generated in ${bundle.rootName}. Validation ${
          validation.ok ? "passed" : "failed"
        }.`,
      );
      setLastCommand("export generated");
    };

    const generateTsxExport = () => {
      const latestCommands = commandLog[0]?.commands;
      const bundle = createCanvasExportBundle(document, {
        selectedObjectId: document.selectedObjectId,
        commands: latestCommands,
        summary: summarizeScene(document),
        diagnostics: geometryDiagnostics,
        viewport,
        tsxOptions: { componentName: "GeneratedPage" },
      });
      const validation = validateCanvasExportBundle(bundle, {
        expectedCommands: latestCommands !== undefined,
      });
      setExportBundle(bundle);
      setExportValidation(validation);
      setRasterArtifact(undefined);
      setRasterStatus("");
      setSelectedExportPath("generated-page.tsx");
      setExportStatus(
        `generated-page.tsx added to ${bundle.rootName}. Validation ${
          validation.ok ? "passed" : "failed"
        }.`,
      );
      setLastCommand("TSX page generated");
    };

    const setRasterScale = (scale: number) => {
      setRasterScaleState(scale);
      setRasterArtifact(undefined);
      setRasterStatus("");
    };

    const setRasterBackground = (background: RasterExportBackground) => {
      setRasterBackgroundState(background);
      setRasterArtifact(undefined);
      setRasterStatus("");
    };

    const generatePngExport = async () => {
      try {
        setRasterStatus("Generating PNG from render.svg...");
        const rasterOptions: NormalizedRasterExportOptions = normalizeRasterExportOptions({
          mimeType: "image/png",
          scale: rasterScale,
          background: rasterBackground,
        });
        const path = getRasterExportFileName("render", rasterOptions);
        const blob = await lowerCanvasDocumentToRasterBlob(document, rasterOptions);
        const artifact = {
          path,
          mimeType: rasterOptions.mimeType,
          blob,
          size: blob.size,
        };
        const latestCommands = commandLog[0]?.commands;
        const bundle = createCanvasExportBundle(document, {
          selectedObjectId: document.selectedObjectId,
          commands: latestCommands,
          summary: summarizeScene(document),
          diagnostics: geometryDiagnostics,
          viewport,
          rasterArtifactPath: path,
          rasterOptions,
        });
        const validation = validateCanvasExportBundle(bundle, {
          expectedCommands: latestCommands !== undefined,
        });

        setRasterArtifact(artifact);
        setExportBundle(bundle);
        setExportValidation(validation);
        setSelectedExportPath("handoff.toml");
        setRasterStatus(`Generated ${path}.`);
        setExportStatus(
          `${bundle.files.length} text files generated with PNG lowering metadata. Validation ${
            validation.ok ? "passed" : "failed"
          }.`,
        );
        setLastCommand("PNG lowered from render.svg");
      } catch (caught) {
        const message = caught instanceof Error ? caught.message : "PNG export failed.";
        setRasterStatus(message);
        setLastCommand("PNG export failed");
      }
    };

    const selectExportFile = (path: string) => {
      setSelectedExportPath(path);
      setExportStatus("");
    };

    const copySelectedExportFile = () => {
      const selectedFile = getSelectedExportFile(exportBundle, selectedExportPath);
      if (!selectedFile) return;

      if (!navigator.clipboard?.writeText) {
        setExportStatus("Clipboard API is unavailable in this browser.");
        return;
      }

      navigator.clipboard
        .writeText(selectedFile.text)
        .then(() => setExportStatus(`Copied ${selectedFile.path}.`))
        .catch(() => setExportStatus(`Could not copy ${selectedFile.path}.`));
    };

    const copyValidationReport = () => {
      if (!exportValidation) return;

      if (!navigator.clipboard?.writeText) {
        setExportStatus("Clipboard API is unavailable in this browser.");
        return;
      }

      navigator.clipboard
        .writeText(formatCanvasExportValidationReport(exportValidation))
        .then(() => setExportStatus("Copied validation report."))
        .catch(() => setExportStatus("Could not copy validation report."));
    };

    const downloadSelectedExportFile = () => {
      const selectedFile = getSelectedExportFile(exportBundle, selectedExportPath);
      if (!selectedFile) return;

      const blob = new Blob([selectedFile.text], {
        type: selectedFile.mimeType,
      });
      const url = URL.createObjectURL(blob);
      const anchor = window.document.createElement("a");
      anchor.href = url;
      anchor.download = `${exportBundle?.rootName ?? document.id}-${selectedFile.path.replace(/\//g, "__")}`;
      window.document.body.append(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
      setExportStatus(`Downloaded ${selectedFile.path}.`);
    };

    const downloadRasterArtifact = () => {
      if (!rasterArtifact) return;

      const url = URL.createObjectURL(rasterArtifact.blob);
      const anchor = window.document.createElement("a");
      anchor.href = url;
      anchor.download = rasterArtifact.path;
      window.document.body.append(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
      setRasterStatus(`Downloaded ${rasterArtifact.path}.`);
    };

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
      exportPresets: CANVAS_EXPORT_PRESETS,
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
      setCheckpointNote: setCheckpointNoteValue,
      setRasterScale,
      setRasterBackground,
      generatePngExport,
      selectExportFile,
      copySelectedExportFile,
      copyValidationReport,
      downloadSelectedExportFile,
      downloadRasterArtifact,
    };
  }, [
    activeMode,
    document,
    viewport,
    aidToggles,
    lastCommand,
    commandJson,
    commandValidation,
    commandLog,
    lastApplyResults,
    terminalLog,
    terminalCollapsed,
    terminalInput,
    spriteFrameEditSettings,
    lastToolResult,
    geometryDiagnostics,
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
    commandLogCollapsed,
    returnToModeSelection,
    activeModeId,
    selectedSpriteFrame?.frame.id,
    editorSession.runTool,
    editorSession.runCommands,
    editorSession.replaceDocument,
  ]);

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
