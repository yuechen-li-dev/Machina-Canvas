import type { MachinaSlotProps } from "machinalayout/react";
import { useState } from "react";
import { validateBlockoutSidecar } from "../../blockoutSidecar";
import { formatCanvasMeasurement, getCanvasUnitSystem } from "../../canvasUnits";
import { formatCoordinateProfileSummary, getCoordinateProfile } from "../../coordinateProfiles";
import { validateGuideAlignmentMarks } from "../../guideAlignment";
import { validateGuideSidecar } from "../../guideSidecar";
import { InspectorAccordionGroup } from "../../InspectorAccordionGroup";
import {
  getMechanicalInspectorSummary,
  validateMechanicalAnnotationsForScene,
} from "../../mechanicalAnnotations";
import {
  GuideAlignmentSection,
  getGuideAlignmentSourceMarks,
} from "../../modules/guides/ui/GuideAlignmentSection";
import { ImageAssetSection } from "../../modules/images/ui/ImageAssetSection";
import {
  getSelectedSpriteFrameDatumTargets,
  getSelectedSpriteFrameGuideRegionContext,
  getSelectedSpriteFrameState,
  SelectedSpriteFrameSection,
  SpriteAuditSectionContent,
} from "../../modules/sprites/ui/SpriteInspectorSections";
import { UiPropEditor } from "../../modules/webUi/ui/UiPropEditor";
import { objectToGridRef } from "../../referenceGrid";
import { getSelectedObjectMeasurements } from "../../sceneMeasurement";
import type { ImageObject } from "../../sceneModel";
import { getGuideSidecarsForSpriteSidecar } from "../../spriteGuideRegions";
import {
  getSpriteOverlayDisplayModeLabel,
  SPRITE_OVERLAY_DISPLAY_MODES,
} from "../../spriteOverlay";
import { getSpriteFrameSummary } from "../../spriteSidecar";
import { getCanvasUiComponentDefinition } from "../../uiComponents/catalog";
import {
  formatDocumentSize,
  formatFrameIntent,
  getBlockoutSidecarsForObject,
  getGuideSidecarsForImage,
  getObjectLayer,
  getSelectedObject,
  getSketchOverlayForImage,
  getSpriteSidecarForImage,
  getSpriteSidecarTarget,
  type InspectorGroupId,
  objectKindLabels,
  readViewData,
} from "../editor/editorShared";
import { renderCanvasModuleInspector } from "../inspectorContributions";
import { CanvasToolsSection } from "./CanvasToolsSection";
import {
  CommandJsonPanel,
  ExportPanel,
  GeometryDiagnosticsSection,
  ViewAidsSection,
  ViewportSection,
} from "./InspectorPanels";
import {
  Field,
  formatImageSrcLabel,
  getDefaultInspectorAccordionState,
  ToggleField,
} from "./shared";

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
          {renderCanvasModuleInspector({ object: selected, runCommand })}
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
          {selected.kind === "mechanicalAnnotationSidecar"
            ? (() => {
                const summary = getMechanicalInspectorSummary(document, selected);
                return (
                  <>
                    <Field label="Target" value={selected.targetObjectId ?? "canvas"} />
                    <Field
                      label="Coordinates"
                      value={formatCoordinateProfileSummary(coordinateProfile)}
                    />
                    <Field label="Sheet" value={summary.sheetTarget} />
                    <Field label="Size" value={summary.sheetSizeLabel} />
                    <Field label="Print margin" value={summary.printMarginLabel} />
                    <Field label="Units" value={summary.units} />
                    <Field label="Scale" value={summary.scale} />
                    <Field label="Drawing no." value={summary.drawingNumber} />
                    <Field label="Title" value={summary.title} />
                    <Field label="Revision" value={summary.revision} />
                    <Field label="Dimensions" value={summary.dimensionCount} />
                    <Field label="Notes" value={summary.noteCount} />
                    <Field label="Datums" value={summary.datumCount} />
                    <Field label="Blocks" value={summary.blockCount} />
                    <Field label="Diagnostics" value={summary.diagnosticsCount} />
                    <Field label="Ref diagnostics" value={summary.referenceDiagnosticCount} />
                    {summary.sheetNotice ? <p>{summary.sheetNotice}</p> : null}
                  </>
                );
              })()
            : null}
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
      {selected.kind === "spriteSidecar" ? (
        <InspectorAccordionGroup
          id="sprite-sidecar"
          key={`${inspectorContextKey}:sprite-sidecar`}
          onOpenChange={(open) => setAccordionOpen("sprite-sidecar", open)}
          open={accordionState["sprite-sidecar"]}
          subtitle={`${selected.spec.frames.length} frames`}
          title="Sprite sidecar"
        >
          <Field label="Target" value={selected.targetId} />
          <Field label="Dialect" value={selected.spec.dialect} />
          <Field label="Source" value={selected.spec.sourceName ?? "unknown"} />
          <Field
            label="Atlas"
            value={
              selected.spec.atlasWidth && selected.spec.atlasHeight
                ? `${selected.spec.atlasWidth} x ${selected.spec.atlasHeight}`
                : "unknown"
            }
          />
          <Field label="Subgrids" value={selected.spec.grids.length} />
          <Field label="Stackframes" value={selected.spec.stackframes.length} />
          <Field label="Frames" value={selected.spec.frames.length} />
          <Field label="Animations" value={selected.spec.animations.length} />
          <label className="sprite-frame-select">
            <span>Overlay mode</span>
            <select
              value={selected.spec.overlay.displayMode}
              onChange={(event) =>
                runCommand({
                  kind: "setSpriteOverlayDisplayMode",
                  sidecarId: selected.id,
                  mode: event.currentTarget.value as
                    | "focus"
                    | "cutEdit"
                    | "gridEdit"
                    | "audit"
                    | "debug",
                })
              }
            >
              {SPRITE_OVERLAY_DISPLAY_MODES.map((mode) => (
                <option key={mode} value={mode}>
                  {getSpriteOverlayDisplayModeLabel(mode)}
                </option>
              ))}
            </select>
          </label>
          <ToggleField
            checked={selected.spec.overlay.showBounds}
            label="Bounds / cut lines"
            onChange={(value) =>
              runCommand({
                kind: "setSpriteOverlayOption",
                sidecarId: selected.id,
                option: "showBounds",
                value,
              })
            }
          />
          <ToggleField
            checked={selected.spec.overlay.showSubgrids}
            label="Subgrid regions"
            onChange={(value) =>
              runCommand({
                kind: "setSpriteOverlayOption",
                sidecarId: selected.id,
                option: "showSubgrids",
                value,
              })
            }
          />
          <ToggleField
            checked={selected.spec.overlay.showExactFrames}
            label="Exact/custom frames"
            onChange={(value) =>
              runCommand({
                kind: "setSpriteOverlayOption",
                sidecarId: selected.id,
                option: "showExactFrames",
                value,
              })
            }
          />
          <ToggleField
            checked={selected.spec.overlay.showLabels}
            label="All frame labels"
            onChange={(value) =>
              runCommand({
                kind: "setSpriteOverlayOption",
                sidecarId: selected.id,
                option: "showLabels",
                value,
              })
            }
          />
          <ToggleField
            checked={selected.spec.overlay.selectedOnly}
            label="Legacy selected-only filter"
            onChange={(value) =>
              runCommand({
                kind: "setSpriteOverlayOption",
                sidecarId: selected.id,
                option: "selectedOnly",
                value,
              })
            }
          />
          <label className="sprite-frame-select">
            <span>Selected frame</span>
            <select
              value={selected.spec.selectedFrameId ?? ""}
              onChange={(event) =>
                runCommand({
                  kind: "selectSpriteFrame",
                  sidecarId: selected.id,
                  frameId: event.currentTarget.value || undefined,
                })
              }
            >
              {selected.spec.frames.map((frame) => (
                <option key={frame.id} value={frame.id}>
                  {frame.label}
                </option>
              ))}
            </select>
          </label>
          <div className="sprite-frame-list">
            {selected.spec.frames.slice(0, 36).map((frame) => (
              <button
                className={
                  selected.spec.selectedFrameId === frame.id
                    ? "sprite-frame-card is-selected"
                    : "sprite-frame-card"
                }
                key={frame.id}
                type="button"
                onClick={() =>
                  runCommand({
                    kind: "selectSpriteFrame",
                    sidecarId: selected.id,
                    frameId: frame.id,
                  })
                }
              >
                <strong>{frame.label}</strong>
                <small>{getSpriteFrameSummary(frame)}</small>
              </button>
            ))}
          </div>
        </InspectorAccordionGroup>
      ) : null}
      {selected.kind === "image" ? (
        <InspectorAccordionGroup
          id="alignment"
          key={`${inspectorContextKey}:alignment`}
          onOpenChange={(open) => setAccordionOpen("alignment", open)}
          open={accordionState.alignment}
          subtitle={`${getGuideAlignmentSourceMarks(document, selected.id).length} marks`}
          title="Alignment"
        >
          <GuideAlignmentSection
            document={document}
            runCommand={runCommand}
            sourceObjectId={selected.id}
          />
        </InspectorAccordionGroup>
      ) : null}
      {selected.kind === "image" ? (
        <InspectorAccordionGroup
          id="sprite-sidecar"
          key={`${inspectorContextKey}:sprite-sidecar`}
          onOpenChange={(open) => setAccordionOpen("sprite-sidecar", open)}
          open={accordionState["sprite-sidecar"]}
          title="Sprite sidecar"
        >
          {(() => {
            const sidecar = getSpriteSidecarForImage(document, selected);
            if (!sidecar) return <Field label="Sidecar" value="none" />;
            const currentFrame = sidecar.spec.frames.find(
              (frame) => frame.id === sidecar.spec.selectedFrameId,
            );
            return (
              <>
                <Field label="Sidecar" value={sidecar.id} />
                <Field label="Dialect" value={sidecar.spec.dialect} />
                <Field label="Subgrids" value={sidecar.spec.grids.length} />
                <Field label="Stackframes" value={sidecar.spec.stackframes.length} />
                <Field label="Frames" value={sidecar.spec.frames.length} />
                <Field
                  label="Overlay mode"
                  value={getSpriteOverlayDisplayModeLabel(sidecar.spec.overlay.displayMode)}
                />
                <Field
                  label="Selected"
                  value={currentFrame ? getSpriteFrameSummary(currentFrame) : "none"}
                />
                <div className="command-row">
                  <button
                    type="button"
                    onClick={() =>
                      runCommand({
                        kind: "setSpriteSidecarVisible",
                        sidecarId: sidecar.id,
                        visible: !sidecar.visible,
                      })
                    }
                  >
                    {sidecar.visible ? "Hide Sprite Overlay" : "Show Sprite Overlay"}
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      runCommand({
                        kind: "detachSpriteSidecar",
                        sourceId: selected.id,
                      })
                    }
                  >
                    Detach Sprite Sidecar
                  </button>
                </div>
              </>
            );
          })()}
        </InspectorAccordionGroup>
      ) : null}
      {selected.kind === "guideSidecar" ? (
        <InspectorAccordionGroup
          id="sprite-sidecar"
          key={`${inspectorContextKey}:guide-sidecar`}
          onOpenChange={(open) => setAccordionOpen("sprite-sidecar", open)}
          open={accordionState["sprite-sidecar"]}
          subtitle={`${selected.guide.regions.length} regions · ${selected.guide.datums.length} datums · ${selected.guide.dimensions.length} dimensions · ${selected.guide.alignmentMarks.length} marks`}
          title="Guide sidecar"
        >
          {(() => {
            const targetImage =
              selected.targetId && document.objects[selected.targetId]?.kind === "image"
                ? (document.objects[selected.targetId] as ImageObject)
                : undefined;
            const diagnostics = [
              ...validateGuideSidecar(selected.guide, {
                imageWidth: targetImage?.intrinsicWidth ?? targetImage?.width,
                imageHeight: targetImage?.intrinsicHeight ?? targetImage?.height,
              }),
              ...validateGuideAlignmentMarks(document).filter((diagnostic) =>
                selected.guide.alignmentMarks.some(
                  (mark) => mark.id === diagnostic.alignmentMarkId,
                ),
              ),
            ];
            return (
              <>
                <Field label="Attached owner" value={selected.targetId ?? "unattached"} />
                <Field label="Visible" value={selected.visible ? "yes" : "no"} />
                <Field label="Opacity" value={String(selected.opacity ?? 0.9)} />
                <Field label="Units" value={selected.guide.units} />
                <Field label="Regions" value={selected.guide.regions.length} />
                <Field label="Datums" value={selected.guide.datums.length} />
                <Field label="Dimensions" value={selected.guide.dimensions.length} />
                <Field label="Alignment marks" value={selected.guide.alignmentMarks.length} />
                <Field label="Validation findings" value={diagnostics.length} />
                {selected.guide.description ? (
                  <Field label="Description" value={selected.guide.description} />
                ) : null}
                {targetImage ? (
                  <GuideAlignmentSection
                    document={document}
                    runCommand={runCommand}
                    sourceGuideSidecarId={selected.id}
                    sourceObjectId={targetImage.id}
                  />
                ) : null}
                <div className="command-row">
                  <button
                    type="button"
                    onClick={() =>
                      runCommand({
                        kind: "setGuideSidecarVisible",
                        guideId: selected.id,
                        visible: !selected.visible,
                      })
                    }
                  >
                    {selected.visible ? "Hide Guide Overlay" : "Show Guide Overlay"}
                  </button>
                  <button
                    disabled={!selected.targetId}
                    type="button"
                    onClick={() =>
                      runCommand({
                        kind: "detachGuideSidecar",
                        guideId: selected.id,
                      })
                    }
                  >
                    Detach Guide Sidecar
                  </button>
                </div>
                <div className="command-row">
                  <button
                    type="button"
                    onClick={() =>
                      runCommand({
                        kind: "setGuideSidecarOpacity",
                        guideId: selected.id,
                        opacity: Math.max(0.15, Math.min(1, (selected.opacity ?? 0.9) - 0.15)),
                      })
                    }
                  >
                    Lower opacity
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      runCommand({
                        kind: "setGuideSidecarOpacity",
                        guideId: selected.id,
                        opacity: Math.max(0.15, Math.min(1, (selected.opacity ?? 0.9) + 0.15)),
                      })
                    }
                  >
                    Raise opacity
                  </button>
                </div>
                {diagnostics.length ? (
                  <div className="validation-result is-error">
                    <strong>Guide validation</strong>
                    <ul>
                      {diagnostics.map((diagnostic) => (
                        <li key={`${diagnostic.code}-${diagnostic.message}`}>
                          <span>{diagnostic.code}</span>
                          {`: ${diagnostic.message}`}
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : (
                  <div className="validation-result is-ok">
                    <strong>Guide validation</strong>
                    <p>No guide findings.</p>
                  </div>
                )}
              </>
            );
          })()}
        </InspectorAccordionGroup>
      ) : null}
      {selected.kind === "blockoutSidecar" ? (
        <InspectorAccordionGroup
          id="sprite-sidecar"
          key={`${inspectorContextKey}:blockout-sidecar`}
          onOpenChange={(open) => setAccordionOpen("sprite-sidecar", open)}
          open={accordionState["sprite-sidecar"]}
          subtitle={`${selected.blockout.boxes.length} boxes`}
          title="Blockout sidecar"
        >
          {(() => {
            const targetObject = selected.targetObjectId
              ? document.objects[selected.targetObjectId]
              : undefined;
            const diagnostics = validateBlockoutSidecar(selected.blockout);
            return (
              <>
                <Field label="Target object" value={selected.targetObjectId ?? "unattached"} />
                <Field label="Visible" value={selected.visible ? "yes" : "no"} />
                <Field label="Opacity" value={String(selected.opacity ?? 0.72)} />
                <Field label="Boxes" value={selected.blockout.boxes.length} />
                <Field label="Points" value={selected.blockout.points.length} />
                <Field label="Curves" value={selected.blockout.curves.length} />
                <Field label="Diagnostics" value={diagnostics.length} />
                {selected.blockout.description ? (
                  <Field label="Description" value={selected.blockout.description} />
                ) : null}
                {targetObject ? <Field label="Owner" value={targetObject.name} /> : null}
                <div className="command-row">
                  <button
                    type="button"
                    onClick={() =>
                      runCommand({
                        kind: "setBlockoutSidecarVisible",
                        blockoutId: selected.id,
                        visible: !selected.visible,
                      })
                    }
                  >
                    {selected.visible ? "Hide Blockout Overlay" : "Show Blockout Overlay"}
                  </button>
                  <button
                    disabled={!selected.targetObjectId}
                    type="button"
                    onClick={() =>
                      runCommand({
                        kind: "detachBlockoutSidecar",
                        blockoutId: selected.id,
                      })
                    }
                  >
                    Detach Blockout Sidecar
                  </button>
                </div>
                <div className="command-row">
                  <button
                    type="button"
                    onClick={() =>
                      runCommand({
                        kind: "setBlockoutSidecarOpacity",
                        blockoutId: selected.id,
                        opacity: Math.max(0.15, Math.min(1, (selected.opacity ?? 0.72) - 0.15)),
                      })
                    }
                  >
                    Lower opacity
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      runCommand({
                        kind: "setBlockoutSidecarOpacity",
                        blockoutId: selected.id,
                        opacity: Math.max(0.15, Math.min(1, (selected.opacity ?? 0.72) + 0.15)),
                      })
                    }
                  >
                    Raise opacity
                  </button>
                </div>
                {diagnostics.length ? (
                  <div className="validation-result is-error">
                    <strong>Blockout validation</strong>
                    <ul>
                      {diagnostics.map((diagnostic) => (
                        <li key={`${diagnostic.code}-${diagnostic.message}`}>
                          <span>{diagnostic.code}</span>
                          {`: ${diagnostic.message}`}
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : (
                  <div className="validation-result is-ok">
                    <strong>Blockout validation</strong>
                    <p>No blockout findings.</p>
                  </div>
                )}
              </>
            );
          })()}
        </InspectorAccordionGroup>
      ) : null}
      {selected.kind === "mechanicalAnnotationSidecar" ? (
        <InspectorAccordionGroup
          id="sprite-sidecar"
          key={`${inspectorContextKey}:mechanical-sidecar`}
          onOpenChange={(open) => setAccordionOpen("sprite-sidecar", open)}
          open={accordionState["sprite-sidecar"]}
          subtitle={`${selected.annotations.dimensions.length} dimensions`}
          title="Mechanical annotations"
        >
          {(() => {
            const diagnostics = validateMechanicalAnnotationsForScene(document, selected);
            const summary = getMechanicalInspectorSummary(document, selected);
            return (
              <>
                <Field label="Target object" value={selected.targetObjectId ?? "canvas"} />
                <Field label="Sheet" value={summary.sheetTarget} />
                <Field label="Size" value={summary.sheetSizeLabel} />
                <Field label="Print margin" value={summary.printMarginLabel} />
                <Field label="Units" value={summary.units} />
                <Field label="Scale" value={summary.scale} />
                <Field label="Drawing no." value={summary.drawingNumber} />
                <Field label="Title" value={summary.title} />
                <Field label="Revision" value={summary.revision} />
                <Field label="Dimensions" value={summary.dimensionCount} />
                <Field label="Notes" value={summary.noteCount} />
                <Field label="Datums" value={summary.datumCount} />
                <Field label="Blocks" value={summary.blockCount} />
                <Field label="Reference diagnostics" value={summary.referenceDiagnosticCount} />
                <Field label="Diagnostics" value={diagnostics.length} />
                {summary.sheetNotice ? <p>{summary.sheetNotice}</p> : null}
                {summary.dimensionReferenceSummaries.length ? (
                  <div className="validation-result">
                    <strong>Reference-backed dimensions</strong>
                    <ul>
                      {summary.dimensionReferenceSummaries.map((entry) =>
                        entry.references.map((reference) => (
                          <li
                            key={`${entry.dimensionId}-${reference.objectId}-${reference.anchor}`}
                          >
                            <span>{entry.label}</span>
                            {`: ${reference.objectId} · ${reference.anchor} · ${
                              reference.resolved ? "resolved" : "unresolved"
                            }`}
                          </li>
                        )),
                      )}
                    </ul>
                  </div>
                ) : null}
                {diagnostics.length ? (
                  <div className="validation-result is-error">
                    <strong>Mechanical annotation diagnostics</strong>
                    <ul>
                      {diagnostics.map((diagnostic) => (
                        <li key={`${diagnostic.code}-${diagnostic.message}`}>
                          <span>{diagnostic.code}</span>
                          {`: ${diagnostic.message}`}
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : (
                  <div className="validation-result is-ok">
                    <strong>Mechanical annotation diagnostics</strong>
                    <p>No findings.</p>
                  </div>
                )}
              </>
            );
          })()}
        </InspectorAccordionGroup>
      ) : null}
      {selected.kind === "image" || selected.kind === "spriteSidecar" ? (
        <InspectorAccordionGroup
          id="sprite-audit"
          key={`${inspectorContextKey}:sprite-audit`}
          onOpenChange={(open) => setAccordionOpen("sprite-audit", open)}
          open={accordionState["sprite-audit"]}
          title="Sprite audit"
        >
          {selected.kind === "image"
            ? (() => {
                const sidecar = getSpriteSidecarForImage(document, selected);
                if (!sidecar)
                  return <Field label="Sprite audit" value="linked sprite sidecar missing" />;
                return (
                  <SpriteAuditSectionContent
                    key={`${sidecar.id}:${selected.id}`}
                    document={document}
                    image={selected}
                    sidecar={sidecar}
                  />
                );
              })()
            : (() => {
                const imageTarget = getSpriteSidecarTarget(document, selected);
                if (!imageTarget)
                  return <Field label="Sprite audit" value="linked image missing" />;
                return (
                  <SpriteAuditSectionContent
                    key={`${selected.id}:${imageTarget.id}`}
                    document={document}
                    image={imageTarget}
                    sidecar={selected}
                  />
                );
              })()}
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
      {selected.kind === "uiComponent" ? (
        <InspectorAccordionGroup
          id="ui-component"
          key={`${inspectorContextKey}:ui-component`}
          onOpenChange={(open) => setAccordionOpen("ui-component", open)}
          open={accordionState["ui-component"]}
          subtitle={selected.componentId}
          title="UI Component"
        >
          {(() => {
            try {
              const definition = getCanvasUiComponentDefinition(selected.componentId);
              return (
                <>
                  <Field label="Component" value={selected.componentId} />
                  <Field label="Label" value={definition.label} />
                  <Field label="Variant" value={selected.variant ?? "none"} />
                  <Field label="Export name" value={selected.exportName ?? "auto"} />
                  <div className="ui-prop-list">
                    {definition.propSchema.map((prop) => (
                      <UiPropEditor
                        key={prop.name}
                        objectId={selected.id}
                        prop={prop}
                        value={selected.props[prop.name] ?? definition.defaultProps[prop.name]}
                        runCommand={runCommand}
                      />
                    ))}
                  </div>
                </>
              );
            } catch (error) {
              return (
                <Field
                  label="Component"
                  value={error instanceof Error ? error.message : selected.componentId}
                />
              );
            }
          })()}
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
