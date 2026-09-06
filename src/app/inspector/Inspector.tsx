import type { MachinaSlotProps } from "machinalayout/react";
import { useState } from "react";
import { formatCanvasMeasurement, getCanvasUnitSystem } from "../../canvasUnits";
import { formatCoordinateProfileSummary, getCoordinateProfile } from "../../coordinateProfiles";
import { InspectorAccordionGroup } from "../../InspectorAccordionGroup";
import { ImageAssetSection } from "../../modules/images/ui/ImageAssetSection";
import {
  getSelectedSpriteFrameDatumTargets,
  getSelectedSpriteFrameGuideRegionContext,
  getSelectedSpriteFrameState,
  SelectedSpriteFrameSection,
} from "../../modules/sprites/ui/SpriteInspectorSections";
import { objectToGridRef } from "../../referenceGrid";
import { getSelectedObjectMeasurements } from "../../sceneMeasurement";
import { getGuideSidecarsForSpriteSidecar } from "../../spriteGuideRegions";
import {
  formatDocumentSize,
  formatFrameIntent,
  getBlockoutSidecarsForObject,
  getGuideSidecarsForImage,
  getObjectLayer,
  getSelectedObject,
  getSketchOverlayForImage,
  getSpriteSidecarForImage,
  type InspectorGroupId,
  objectKindLabels,
  readViewData,
} from "../editor/editorShared";
import {
  renderCanvasModuleInspectorPanels,
  renderCanvasModuleInspectorSummary,
} from "../inspectorContributions";
import { CanvasToolsSection } from "./CanvasToolsSection";
import {
  CommandJsonPanel,
  ExportPanel,
  GeometryDiagnosticsSection,
  ViewAidsSection,
  ViewportSection,
} from "./InspectorPanels";
import { Field, formatImageSrcLabel, getDefaultInspectorAccordionState } from "./shared";

export function Inspector(props: MachinaSlotProps) {
  const view = readViewData(props);
  const {
    activeMode,
    document,
    aidToggles,
    isToolGroupVisible,
    runCommand,
    spriteFrameEditSettings,
    setSpriteFrameEditSettings,
    zoomToSelected,
  } = view;
  const selected = getSelectedObject(document);
  const layer = getObjectLayer(document, selected);
  const unitSystem = getCanvasUnitSystem(document);
  const coordinateProfile = getCoordinateProfile(document.coordinateProfileId);
  const measurements = getSelectedObjectMeasurements(document);
  const showGeometryTools = isToolGroupVisible("geometry");
  const showImageTools = isToolGroupVisible("image") || isToolGroupVisible("sprite");
  const showViewAids = isToolGroupVisible("viewAids");
  const showExport = isToolGroupVisible("export");
  const selectedSpriteFrame = getSelectedSpriteFrameState(document, selected);
  const selectedGuideRegionContext = getSelectedSpriteFrameGuideRegionContext(document, selected);
  const selectedDatumTargets = getSelectedSpriteFrameDatumTargets(document, selected, {
    maxDistance: spriteFrameEditSettings.datumSnapDistance,
    restrictToRegion: spriteFrameEditSettings.restrictDatumSnapsToGuideRegion,
  });
  const selectedFrameGuideSidecarCount = selectedSpriteFrame
    ? getGuideSidecarsForSpriteSidecar(document, selectedSpriteFrame.sidecar.id).length
    : 0;
  const hasSpriteAuditResults = Boolean(
    (selected?.kind === "spriteSidecar" && selected.spec.diagnostics.length > 0) ||
      (selected?.kind === "image" &&
        getSpriteSidecarForImage(document, selected)?.spec.diagnostics.length),
  );
  const accordionDefaults = getDefaultInspectorAccordionState({
    modeId: activeMode.id,
    selected,
    showViewAids,
    showImageTools,
    showExport,
    hasSelectedSpriteFrame: selectedSpriteFrame !== undefined,
    hasSpriteAuditResults,
  });
  const inspectorContextKey = `${activeMode.id}:${selected?.id ?? "document"}`;
  const [accordionStateByContext, setAccordionStateByContext] = useState<
    Partial<Record<string, Record<InspectorGroupId, boolean>>>
  >({});
  const accordionState = accordionStateByContext[inspectorContextKey] ?? accordionDefaults;
  const setAccordionOpen = (groupId: InspectorGroupId, open: boolean) =>
    setAccordionStateByContext((current) => ({
      ...current,
      [inspectorContextKey]: {
        ...(current[inspectorContextKey] ?? accordionDefaults),
        [groupId]: open,
      },
    }));

  if (!selected) {
    return (
      <aside className="inspector panel">
        <header className="panel-title">
          <small>Inspector</small>
          <h2>{document.name}</h2>
        </header>
        {showGeometryTools ? (
          <InspectorAccordionGroup
            id="selected-object"
            key={`${inspectorContextKey}:selected-object`}
            onOpenChange={(open) => setAccordionOpen("selected-object", open)}
            open={accordionState["selected-object"]}
            subtitle="Document"
            title="Selected object"
          >
            <Field label="ID" value={document.id} />
            <Field label="Size" value={formatDocumentSize(document)} />
            <Field label="Coordinates" value={formatCoordinateProfileSummary(coordinateProfile)} />
            <Field label="Unit" value={unitSystem.label} />
            <Field label="Pixels/unit" value={unitSystem.pixelsPerUnit} />
            <Field label="Layers" value={document.layers.length} />
            <Field label="Objects" value={Object.keys(document.objects).length} />
          </InspectorAccordionGroup>
        ) : null}
        {showViewAids ? (
          <InspectorAccordionGroup
            id="viewport"
            key={`${inspectorContextKey}:viewport`}
            onOpenChange={(open) => setAccordionOpen("viewport", open)}
            open={accordionState.viewport}
            subtitle={`${Math.round(view.viewport.zoom * 100)}%`}
            title="Viewport"
          >
            <ViewportSection {...props} />
          </InspectorAccordionGroup>
        ) : null}
        {showViewAids ? (
          <InspectorAccordionGroup
            id="view-aids"
            key={`${inspectorContextKey}:view-aids`}
            onOpenChange={(open) => setAccordionOpen("view-aids", open)}
            open={accordionState["view-aids"]}
            title="View aids"
          >
            <ViewAidsSection {...props} />
          </InspectorAccordionGroup>
        ) : null}
        {showImageTools ? (
          <InspectorAccordionGroup
            id="image-assets"
            key={`${inspectorContextKey}:image-assets`}
            onOpenChange={(open) => setAccordionOpen("image-assets", open)}
            open={accordionState["image-assets"]}
            title="Image assets"
          >
            <ImageAssetSection {...props} />
          </InspectorAccordionGroup>
        ) : null}
        {showExport ? (
          <InspectorAccordionGroup
            id="export"
            key={`${inspectorContextKey}:export`}
            onOpenChange={(open) => setAccordionOpen("export", open)}
            open={accordionState.export}
            title="Export / Handoff"
          >
            <ExportPanel {...props} />
          </InspectorAccordionGroup>
        ) : null}
        <InspectorAccordionGroup
          id="command-diagnostics"
          key={`${inspectorContextKey}:command-diagnostics`}
          onOpenChange={(open) => setAccordionOpen("command-diagnostics", open)}
          open={accordionState["command-diagnostics"]}
          title="Command / Diagnostics"
        >
          {showGeometryTools
            ? measurements.map((measurement) => (
                <Field key={measurement.label} label={measurement.label} value={measurement.text} />
              ))
            : null}
          {aidToggles.showGeometryDiagnostics ? <GeometryDiagnosticsSection {...props} /> : null}
          <CommandJsonPanel {...props} />
        </InspectorAccordionGroup>
      </aside>
    );
  }

  const nextFill = selected.fill === "#e34747" ? "#111111" : "#e34747";
  const selectedGrid = objectToGridRef(selected, document);
  const topLeftGrid = objectToGridRef({ ...selected, width: 0, height: 0 }, document).center.ref;

  return (
    <aside className="inspector panel">
      <header className="panel-title">
        <small>Selected object</small>
        <h2>{selected.name}</h2>
      </header>
      {showGeometryTools ? (
        <InspectorAccordionGroup
          id="selected-object"
          key={`${inspectorContextKey}:selected-object`}
          onOpenChange={(open) => setAccordionOpen("selected-object", open)}
          open={accordionState["selected-object"]}
          subtitle={objectKindLabels[selected.kind]}
          title="Selected object"
        >
          <div className="command-row">
            <button
              type="button"
              onClick={() => runCommand({ kind: "move", id: selected.id, dx: 10, dy: 0 })}
            >
              Move X +10
            </button>
            <button
              type="button"
              onClick={() => runCommand({ kind: "move", id: selected.id, dx: 0, dy: 10 })}
            >
              Move Y +10
            </button>
            <button
              type="button"
              onClick={() => runCommand({ kind: "setFill", id: selected.id, fill: nextFill })}
            >
              Toggle fill
            </button>
          </div>
          <Field label="Kind" value={objectKindLabels[selected.kind]} />
          <Field label="Coordinates" value={formatCoordinateProfileSummary(coordinateProfile)} />
          <Field label="Layer" value={layer?.name ?? selected.layerId} />
          <Field label="Intent" value={formatFrameIntent(selected.frame)} />
          {renderCanvasModuleInspectorSummary({
            document,
            object: selected,
            runCommand,
            panel: {
              contextKey: inspectorContextKey,
              isOpen: (groupId) => accordionState[groupId],
              setOpen: setAccordionOpen,
            },
          })}
          {selected.kind === "image" ? (
            <Field label="Src" value={formatImageSrcLabel(selected.src)} />
          ) : null}
          {selected.kind === "image" ? (
            <Field label="Role" value={selected.role ?? "image"} />
          ) : null}
          {selected.kind === "sketchOverlay" ? (
            <>
              <Field label="Target" value={selected.targetId} />
              <Field label="Dialect" value={selected.spec.dialect} />
              <Field label="Primitives" value={selected.spec.primitives.length} />
              <label className="toggle-row">
                <span>Visible</span>
                <input
                  checked={selected.visible}
                  onChange={(event) =>
                    runCommand({
                      kind: "setSketchOverlayVisible",
                      overlayId: selected.id,
                      visible: event.target.checked,
                    })
                  }
                  type="checkbox"
                />
              </label>
              <div className="sketch-primitive-list">
                {selected.spec.primitives.map((primitive) => (
                  <div className="sketch-primitive-card" key={primitive.id}>
                    <strong>
                      {primitive.kind} / {primitive.id}
                    </strong>
                    <p>
                      {"label" in primitive && primitive.label
                        ? primitive.label
                        : primitive.kind === "label"
                          ? primitive.text
                          : "no label"}
                    </p>
                  </div>
                ))}
              </div>
            </>
          ) : null}
        </InspectorAccordionGroup>
      ) : null}
      {selectedSpriteFrame ? (
        <InspectorAccordionGroup
          id="selected-sprite-frame"
          key={`${inspectorContextKey}:selected-sprite-frame`}
          onOpenChange={(open) => setAccordionOpen("selected-sprite-frame", open)}
          open={accordionState["selected-sprite-frame"]}
          subtitle={selectedSpriteFrame.frame.id}
          title="Selected sprite frame"
        >
          <SelectedSpriteFrameSection
            coordinateProfile={coordinateProfile}
            datumTargets={selectedDatumTargets}
            frame={selectedSpriteFrame.frame}
            guideRegionContext={selectedGuideRegionContext}
            hasGuideSidecars={selectedFrameGuideSidecarCount > 0}
            image={selectedSpriteFrame.image}
            runCommand={runCommand}
            setSpriteFrameEditSettings={setSpriteFrameEditSettings}
            sidecar={selectedSpriteFrame.sidecar}
            spriteFrameEditSettings={spriteFrameEditSettings}
            zoomToSelected={zoomToSelected}
          />
        </InspectorAccordionGroup>
      ) : null}
      {showGeometryTools ? (
        <InspectorAccordionGroup
          id="geometry"
          key={`${inspectorContextKey}:geometry`}
          onOpenChange={(open) => setAccordionOpen("geometry", open)}
          open={accordionState.geometry}
          subtitle={selectedGrid.span}
          title="Geometry"
        >
          <Field
            label="X / Y"
            value={`${formatCanvasMeasurement(selected.x, unitSystem)} / ${formatCanvasMeasurement(selected.y, unitSystem)}`}
          />
          <Field
            label="W / H"
            value={`${formatCanvasMeasurement(selected.width, unitSystem)} / ${formatCanvasMeasurement(selected.height, unitSystem)}`}
          />
          <Field label="Unit" value={unitSystem.label} />
          <Field label="Pixels/unit" value={unitSystem.pixelsPerUnit} />
          {measurements.map((measurement) => (
            <Field key={measurement.label} label={measurement.label} value={measurement.text} />
          ))}
          <Field label="Span" value={selectedGrid.span} />
          <Field label="Center" value={selectedGrid.center.ref} />
          <Field label="Top-left" value={topLeftGrid} />
          <Field label="Fill" value={selected.fill ?? "none"} />
          <Field label="Stroke" value={selected.stroke ?? "none"} />
          {selected.kind === "text" ? <Field label="Font size" value={selected.fontSize} /> : null}
        </InspectorAccordionGroup>
      ) : null}
      {showViewAids ? (
        <InspectorAccordionGroup
          id="viewport"
          key={`${inspectorContextKey}:viewport`}
          onOpenChange={(open) => setAccordionOpen("viewport", open)}
          open={accordionState.viewport}
          subtitle={`${Math.round(view.viewport.zoom * 100)}%`}
          title="Viewport"
        >
          <ViewportSection {...props} />
        </InspectorAccordionGroup>
      ) : null}
      {renderCanvasModuleInspectorPanels({
        document,
        object: selected,
        runCommand,
        panel: {
          contextKey: inspectorContextKey,
          isOpen: (groupId) => accordionState[groupId],
          setOpen: setAccordionOpen,
        },
      })}
      {showViewAids ? (
        <InspectorAccordionGroup
          id="view-aids"
          key={`${inspectorContextKey}:view-aids`}
          onOpenChange={(open) => setAccordionOpen("view-aids", open)}
          open={accordionState["view-aids"]}
          title="View aids"
        >
          <ViewAidsSection {...props} />
        </InspectorAccordionGroup>
      ) : null}
      {showImageTools ? (
        <InspectorAccordionGroup
          id="image-assets"
          key={`${inspectorContextKey}:image-assets`}
          onOpenChange={(open) => setAccordionOpen("image-assets", open)}
          open={accordionState["image-assets"]}
          title="Image assets"
        >
          <ImageAssetSection {...props} />
          <CanvasToolsSection {...props} />
          {selected.kind === "image" ? (
            <>
              {(() => {
                const overlay = getSketchOverlayForImage(document, selected);
                if (!overlay) {
                  const demoOverlay = document.objects["generated-product-sketch"];
                  const attachable =
                    demoOverlay?.kind === "sketchOverlay" && demoOverlay.targetId === selected.id;
                  return (
                    <>
                      <Field label="Sketch overlay" value="none" />
                      {attachable ? (
                        <div className="command-row">
                          <button
                            type="button"
                            onClick={() =>
                              runCommand({
                                kind: "attachSketchOverlay",
                                sourceId: selected.id,
                                overlayId: demoOverlay.id,
                              })
                            }
                          >
                            Attach Demo Sketch Overlay
                          </button>
                        </div>
                      ) : null}
                    </>
                  );
                }
                return (
                  <>
                    <Field label="Sketch overlay" value={overlay.id} />
                    <Field label="Overlay dialect" value={overlay.spec.dialect} />
                    <div className="command-row">
                      <button
                        type="button"
                        onClick={() =>
                          runCommand({
                            kind: "setSketchOverlayVisible",
                            overlayId: overlay.id,
                            visible: !overlay.visible,
                          })
                        }
                      >
                        {overlay.visible ? "Hide Sketch Overlay" : "Show Sketch Overlay"}
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          runCommand({
                            kind: "detachSketchOverlay",
                            sourceId: selected.id,
                          })
                        }
                      >
                        Detach Sketch Overlay
                      </button>
                    </div>
                  </>
                );
              })()}
              {(() => {
                const guides = getGuideSidecarsForImage(document, selected);
                if (guides.length === 0) {
                  return <Field label="Guide sidecars" value="none" />;
                }
                return (
                  <>
                    <Field
                      label="Guide sidecars"
                      value={guides.map((guide) => guide.id).join(", ")}
                    />
                    <div className="command-row">
                      {guides.map((guide) => (
                        <button
                          key={guide.id}
                          type="button"
                          onClick={() =>
                            runCommand({
                              kind: "setGuideSidecarVisible",
                              guideId: guide.id,
                              visible: !guide.visible,
                            })
                          }
                        >
                          {guide.visible ? `Hide ${guide.id}` : `Show ${guide.id}`}
                        </button>
                      ))}
                    </div>
                  </>
                );
              })()}
              {(() => {
                const blockouts = getBlockoutSidecarsForObject(document, selected);
                if (blockouts.length === 0) {
                  return <Field label="Blockout sidecars" value="none" />;
                }
                return (
                  <>
                    <Field
                      label="Blockout sidecars"
                      value={blockouts.map((blockout) => blockout.id).join(", ")}
                    />
                    <div className="command-row">
                      {blockouts.map((blockout) => (
                        <button
                          key={blockout.id}
                          type="button"
                          onClick={() =>
                            runCommand({
                              kind: "setBlockoutSidecarVisible",
                              blockoutId: blockout.id,
                              visible: !blockout.visible,
                            })
                          }
                        >
                          {blockout.visible ? `Hide ${blockout.id}` : `Show ${blockout.id}`}
                        </button>
                      ))}
                    </div>
                  </>
                );
              })()}
              {selected.alphaMapId ? (
                <Field label="Uses alpha map" value={selected.alphaMapId} />
              ) : null}
              {selected.role === "alphaMap" ? (
                <>
                  <Field label="Role" value="alpha map" />
                  <Field label="Attachable" value="Can be attached to an image object" />
                </>
              ) : null}
            </>
          ) : null}
        </InspectorAccordionGroup>
      ) : null}
      <InspectorAccordionGroup
        id="metadata"
        key={`${inspectorContextKey}:metadata`}
        onOpenChange={(open) => setAccordionOpen("metadata", open)}
        open={accordionState.metadata}
        title="Metadata"
      >
        <Field label="ID" value={selected.id} />
        <Field label="Tags" value={selected.tags?.join(", ") ?? "none"} />
        <Field label="Notes" value={selected.notes ?? "none"} />
      </InspectorAccordionGroup>
      {showExport ? (
        <InspectorAccordionGroup
          id="export"
          key={`${inspectorContextKey}:export`}
          onOpenChange={(open) => setAccordionOpen("export", open)}
          open={accordionState.export}
          title="Export / Handoff"
        >
          <ExportPanel {...props} />
        </InspectorAccordionGroup>
      ) : null}
      <InspectorAccordionGroup
        id="command-diagnostics"
        key={`${inspectorContextKey}:command-diagnostics`}
        onOpenChange={(open) => setAccordionOpen("command-diagnostics", open)}
        open={accordionState["command-diagnostics"]}
        title="Command / Diagnostics"
      >
        {aidToggles.showGeometryDiagnostics ? <GeometryDiagnosticsSection {...props} /> : null}
        <CommandJsonPanel {...props} />
      </InspectorAccordionGroup>
    </aside>
  );
}

export {
  getSelectedSpriteFrameDatumTargets,
  getSelectedSpriteFrameGuideRegionContext,
  getSelectedSpriteFramePreviewModel,
  getSelectedSpriteFrameState,
  getSpriteCommandApplyContext,
} from "../../modules/sprites/ui/SpriteInspectorSections";
export { getDefaultInspectorAccordionState } from "./shared";
