import type { MachinaSlotProps } from "machinalayout/react";
import { useState } from "react";
import { CANVAS_ZOOM_STEPS } from "../../canvasViewport";
import { ExportCartPanel } from "../../ExportCartPanel";
import { getSelectedSpriteFrameState } from "../../modules/sprites/ui/SpriteInspectorSections";
import { summarizeViewport } from "../../viewportSummary";
import {
  commandKindLabels,
  getDiagnosticClass,
  getSelectedObject,
  readViewData,
} from "../editor/editorShared";
import { Field, InspectorSection, ToggleField } from "./shared";

export function ViewportSection(props: MachinaSlotProps) {
  const {
    document,
    viewport,
    fitViewport,
    setZoom,
    zoomToSelected,
    zoomToGridRef,
    zoomToGridSpan,
  } = readViewData(props);
  const [gridRef, setGridRef] = useState("D3");
  const [gridSpan, setGridSpan] = useState("A2-C3");
  const [error, setError] = useState("");
  const selected = getSelectedObject(document);
  const selectedSpriteFrame = getSelectedSpriteFrameState(document, selected);
  const zoomButtonLabel = selectedSpriteFrame ? "Zoom to selected frame" : "Zoom to selected";

  const runViewportAction = (action: () => void) => {
    try {
      action();
      setError("");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not update viewport.");
    }
  };

  return (
    <InspectorSection title="Viewport">
      <Field label="Zoom" value={`${Math.round(viewport.zoom * 100)}%`} />
      <div className="viewport-actions">
        <button type="button" onClick={fitViewport}>
          Fit
        </button>
        {CANVAS_ZOOM_STEPS.map((zoom) => (
          <button
            className={viewport.zoom === zoom ? "is-active" : ""}
            key={zoom}
            type="button"
            onClick={() => setZoom(zoom)}
          >
            {Math.round(zoom * 100)}%
          </button>
        ))}
      </div>
      <button
        className="viewport-wide-button"
        type="button"
        disabled={!selected}
        onClick={() => runViewportAction(zoomToSelected)}
      >
        {zoomButtonLabel}
      </button>
      <label className="viewport-input-row">
        <span>Grid ref</span>
        <input value={gridRef} onChange={(event) => setGridRef(event.currentTarget.value)} />
        <button type="button" onClick={() => runViewportAction(() => zoomToGridRef(gridRef))}>
          Zoom
        </button>
      </label>
      <label className="viewport-input-row">
        <span>Grid span</span>
        <input value={gridSpan} onChange={(event) => setGridSpan(event.currentTarget.value)} />
        <button type="button" onClick={() => runViewportAction(() => zoomToGridSpan(gridSpan))}>
          Zoom
        </button>
      </label>
      {error ? <p className="viewport-error">{error}</p> : null}
      <p className="viewport-summary">{summarizeViewport(document, viewport)}</p>
    </InspectorSection>
  );
}

export function ViewAidsSection(props: MachinaSlotProps) {
  const { aidToggles, setAidToggle } = readViewData(props);

  return (
    <InspectorSection title="View aids">
      <ToggleField
        label="Reference grid"
        checked={aidToggles.showReferenceGrid}
        onChange={(checked) => setAidToggle("showReferenceGrid", checked)}
      />
      <ToggleField
        label="Grid lines"
        checked={aidToggles.showReferenceGridLines}
        onChange={(checked) => setAidToggle("showReferenceGridLines", checked)}
      />
      <ToggleField
        label="Measurement labels"
        checked={aidToggles.showMeasurementLabels}
        onChange={(checked) => setAidToggle("showMeasurementLabels", checked)}
      />
      <ToggleField
        label="Geometry diagnostics"
        checked={aidToggles.showGeometryDiagnostics}
        onChange={(checked) => setAidToggle("showGeometryDiagnostics", checked)}
      />
    </InspectorSection>
  );
}

export function CommandJsonPanel(props: MachinaSlotProps) {
  const {
    commandJson,
    commandValidation,
    lastApplyResults,
    setCommandJson,
    loadExampleCommands,
    validateCommandJson,
    applyCommandJson,
  } = readViewData(props);

  return (
    <InspectorSection title="Command JSON">
      <textarea
        className="command-json-input"
        value={commandJson}
        spellCheck={false}
        onChange={(event) => setCommandJson(event.target.value)}
        aria-label="Command JSON"
      />
      <div className="command-json-actions">
        <button type="button" onClick={validateCommandJson}>
          Validate
        </button>
        <button type="button" onClick={applyCommandJson}>
          Apply
        </button>
        <button type="button" onClick={loadExampleCommands}>
          Load example
        </button>
      </div>
      <p className="empty-note">
        Commands accept grid refs like A1, D3.ne, B4@0.5,0.25 and spans like A2-C3.
      </p>
      <div className={`validation-result ${commandValidation?.ok ? "is-ok" : "is-error"}`}>
        <strong>
          {commandValidation === undefined
            ? "Not validated"
            : commandValidation.ok
              ? "Valid command JSON"
              : "Command JSON has errors"}
        </strong>
        {commandValidation?.diagnostics.length ? (
          <ul>
            {commandValidation.diagnostics.map((diagnostic) => (
              <li
                key={`${diagnostic.code}-${diagnostic.commandIndex}-${diagnostic.objectId}-${diagnostic.message}`}
              >
                <span>{diagnostic.code}</span>
                {diagnostic.commandIndex !== undefined
                  ? ` #${diagnostic.commandIndex + 1}: `
                  : ": "}
                {diagnostic.message}
              </li>
            ))}
          </ul>
        ) : null}
      </div>
      {lastApplyResults.length > 0 ? (
        <div className="last-apply-result">
          <strong>Last applied</strong>
          {lastApplyResults.map((result) => (
            <p key={`${result.command.kind}-${result.message}`}>
              {commandKindLabels[result.command.kind]}: {result.message}
            </p>
          ))}
        </div>
      ) : null}
    </InspectorSection>
  );
}

export function GeometryDiagnosticsSection(props: MachinaSlotProps) {
  const { geometryDiagnostics } = readViewData(props);

  return (
    <InspectorSection title="Geometry diagnostics">
      {geometryDiagnostics.length === 0 ? (
        <p className="empty-note">No geometry diagnostics.</p>
      ) : (
        <div className="diagnostic-list">
          {geometryDiagnostics.map((diagnostic) => (
            <article
              className={`diagnostic ${getDiagnosticClass(diagnostic)}`}
              key={`${diagnostic.code}-${diagnostic.objectIds.join("|")}-${diagnostic.message}`}
            >
              <strong>{diagnostic.code}</strong>
              <p>{diagnostic.message}</p>
              <small>{diagnostic.objectIds.join(", ")}</small>
            </article>
          ))}
        </div>
      )}
    </InspectorSection>
  );
}

export function ExportPanel(props: MachinaSlotProps) {
  const {
    exportArtifacts,
    exportCart,
    exportPresets,
    checkpointNote,
    lastCheckout,
    exportStatus,
    applyExportPreset,
    toggleExportArtifact,
    checkoutExportCart,
    setCheckpointNote,
    saveCheckpoint,
  } = readViewData(props);

  return (
    <InspectorSection title="Export">
      <ExportCartPanel
        artifacts={exportArtifacts}
        cart={exportCart}
        checkpointNote={checkpointNote}
        lastCheckout={lastCheckout}
        onApplyPreset={applyExportPreset}
        onCheckpointNoteChange={setCheckpointNote}
        onCheckout={() => void checkoutExportCart()}
        onSaveCheckpoint={() => void saveCheckpoint()}
        onToggleArtifact={toggleExportArtifact}
        presets={exportPresets}
        status={exportStatus}
      />
    </InspectorSection>
  );
}
