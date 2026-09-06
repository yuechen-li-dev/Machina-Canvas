import { useEffect, useMemo, useState } from "react";
import type { CanvasEditorAsyncCoordinator } from "../async/CanvasEditorAsyncCoordinator";
import type { CanvasExportBundle } from "../../canvasExport";
import type { CanvasExportValidationResult } from "../../canvasExportValidation";
import type { CanvasViewport } from "../../canvasViewport";
import type { CanvasEditorModeId } from "../../editorModes";
import {
  applyExportPreset,
  CANVAS_EXPORT_PRESETS,
  type CanvasExportCart,
  type CanvasExportCheckoutResult,
  collectCanvasExportArtifacts,
  createExportCart,
  reconcileExportCart,
  toggleExportArtifact,
} from "../../exportCart";
import type { RasterExportBackground } from "../../rasterExport";
import type { GeometryDiagnostic } from "../../sceneGeometry";
import type { CanvasDocument } from "../../sceneModel";
import type { CommandLogEntry, RasterExportArtifact } from "../editor/editorShared";

type ExportPresenterInput = {
  readonly coordinator: CanvasEditorAsyncCoordinator;
  readonly document: CanvasDocument;
  readonly viewport: CanvasViewport;
  readonly commandLog: readonly CommandLogEntry[];
  readonly diagnostics: readonly GeometryDiagnostic[];
  readonly activeModeId?: CanvasEditorModeId;
  readonly selectedSpriteFrameId?: string;
  readonly setLastCommand: (message: string) => void;
};

export function useCanvasExportPresenter(input: ExportPresenterInput) {
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
  const [rasterArtifact, setRasterArtifact] = useState<RasterExportArtifact>();
  const [rasterStatus, setRasterStatus] = useState("");
  const exportArtifacts = useMemo(
    () =>
      collectCanvasExportArtifacts({
        scene: input.document,
        activeModeId: input.activeModeId,
        selectedObjectId: input.document.selectedObjectId,
        selectedSpriteFrameId: input.selectedSpriteFrameId,
      }),
    [input.activeModeId, input.document, input.selectedSpriteFrameId],
  );

  useEffect(() => {
    setExportCart((current) => reconcileExportCart(exportArtifacts, current));
  }, [exportArtifacts]);

  const reset = (modeId: CanvasEditorModeId, document: CanvasDocument) => {
    setExportCart(
      createExportCart(
        collectCanvasExportArtifacts({
          scene: document,
          activeModeId: modeId,
          selectedObjectId: document.selectedObjectId,
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
    setRasterArtifact(undefined);
    setRasterStatus("");
  };

  const applyPreset = (presetId: string) => {
    const preset = CANVAS_EXPORT_PRESETS.find((candidate) => candidate.id === presetId);
    if (!preset) {
      setExportStatus(`Unknown export preset "${presetId}".`);
      return;
    }
    setExportCart(applyExportPreset(exportArtifacts, preset));
    setExportStatus(`Preset ${preset.title} selected.`);
  };

  const toggleArtifact = (artifactId: string) => {
    setExportCart((current) => toggleExportArtifact(current, artifactId, exportArtifacts));
  };

  const checkout = async () => {
    const result = await input.coordinator.checkout({
      artifacts: exportArtifacts,
      cart: exportCart,
      activeModeId: input.activeModeId,
    });
    if (result.kind === "err") {
      setExportStatus(`Checkout failed: ${result.error}`);
      input.setLastCommand("export checkout failed");
      return;
    }
    setLastCheckout(result.value);
    setExportStatus(
      `Checked out ${result.value.artifactCount} file${
        result.value.artifactCount === 1 ? "" : "s"
      }: ${result.value.filenames.join(", ")}`,
    );
    input.setLastCommand(result.message);
  };

  const saveCheckpoint = async (message?: string) => {
    const result = await input.coordinator.checkpoint({
      document: input.document,
      activeModeId: input.activeModeId,
      selectedSpriteFrameId: input.selectedSpriteFrameId,
      message: message ?? (checkpointNote.trim() || undefined),
    });
    if (result.kind === "err") {
      setExportStatus(`Checkpoint failed: ${result.error}`);
      input.setLastCommand("checkpoint failed");
      return;
    }
    setLastCheckout(result.value);
    setExportStatus(result.message);
    setCheckpointNote("");
    input.setLastCommand("checkpoint saved");
  };

  const generate = (tsx: boolean) => {
    const result = input.coordinator.generateExport({
      document: input.document,
      viewport: input.viewport,
      commands: input.commandLog[0]?.commands,
      diagnostics: input.diagnostics,
      tsx,
    });
    if (result.kind === "err") {
      setExportStatus(result.error);
      input.setLastCommand("export generation failed");
      return;
    }
    setExportBundle(result.value.bundle);
    setExportValidation(result.value.validation);
    setRasterArtifact(undefined);
    setRasterStatus("");
    setSelectedExportPath(result.value.selectedPath);
    setExportStatus(
      `${result.value.bundle.files.length} files generated in ${
        result.value.bundle.rootName
      }. Validation ${result.value.validation.ok ? "passed" : "failed"}.`,
    );
    input.setLastCommand(result.message);
  };

  const generatePng = async () => {
    setRasterStatus("Generating PNG from render.svg...");
    const result = await input.coordinator.generateRaster({
      document: input.document,
      viewport: input.viewport,
      commands: input.commandLog[0]?.commands,
      diagnostics: input.diagnostics,
      scale: rasterScale,
      background: rasterBackground,
    });
    if (result.kind === "err") {
      setRasterStatus(result.error);
      input.setLastCommand("PNG export failed");
      return;
    }
    setRasterArtifact({ ...result.value.raster, size: result.value.raster.blob.size });
    setExportBundle(result.value.bundle);
    setExportValidation(result.value.validation);
    setSelectedExportPath(result.value.selectedPath);
    setRasterStatus(result.message);
    setExportStatus(
      `${result.value.bundle.files.length} text files generated with PNG lowering metadata. Validation ${
        result.value.validation.ok ? "passed" : "failed"
      }.`,
    );
    input.setLastCommand("PNG lowered from render.svg");
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
  const copySelected = () => {
    const selected = exportBundle?.files.find((file) => file.path === selectedExportPath);
    if (!selected) return;
    input.coordinator
      .copyText(selected.text)
      .then(() => setExportStatus(`Copied ${selected.path}.`))
      .catch((error: unknown) =>
        setExportStatus(
          error instanceof Error ? error.message : `Could not copy ${selected.path}.`,
        ),
      );
  };
  const copyValidation = () => {
    if (!exportValidation) return;
    input.coordinator
      .copyValidation(exportValidation)
      .then(() => setExportStatus("Copied validation report."))
      .catch((error: unknown) =>
        setExportStatus(
          error instanceof Error ? error.message : "Could not copy validation report.",
        ),
      );
  };
  const downloadSelected = () => {
    const selected = exportBundle?.files.find((file) => file.path === selectedExportPath);
    if (!selected) return;
    input.coordinator.download(
      `${exportBundle?.rootName ?? input.document.id}-${selected.path}`,
      selected.text,
      selected.mimeType,
    );
    setExportStatus(`Downloaded ${selected.path}.`);
  };
  const downloadRaster = () => {
    if (!rasterArtifact) return;
    input.coordinator.download(rasterArtifact.path, rasterArtifact.blob, rasterArtifact.mimeType);
    setRasterStatus(`Downloaded ${rasterArtifact.path}.`);
  };

  return {
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
    reset,
    applyPreset,
    toggleArtifact,
    checkout,
    saveCheckpoint,
    generateExport: () => generate(false),
    generateTsxExport: () => generate(true),
    setCheckpointNote,
    setRasterScale,
    setRasterBackground,
    generatePng,
    selectExportFile: setSelectedExportPath,
    copySelected,
    copyValidation,
    downloadSelected,
    downloadRaster,
  };
}
