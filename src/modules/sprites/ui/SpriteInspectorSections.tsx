import { useCallback, useEffect, useState } from "react";
import {
  downloadBlobFile,
  formatBlobSize,
  formatSpriteAuditScope,
  getSpriteSidecarTarget,
  type SpriteAuditArtifact,
  type SpriteAuditScreenshotArtifact,
  type SpriteFrameEditSettings,
} from "../../../app/editor/editorShared";
import { Field, NumberField, ToggleField } from "../../../app/inspector/shared";
import {
  formatCoordinateProfileSummary,
  type getCoordinateProfile,
  visualDirectionDelta,
} from "../../../coordinateProfiles";
import { lowerCanvasDocumentToRasterBlob } from "../../../rasterExport";
import type { CanvasCommand, CanvasCommandApplyContext } from "../../../sceneCommands";
import type {
  CanvasDocument,
  CanvasObject,
  CanvasSpriteFrame,
  ImageObject,
  SpriteSidecarObject,
} from "../../../sceneModel";
import {
  buildSpriteAuditReport,
  createSpriteAuditScreenshotDocument,
  formatSpriteAuditReport,
  type SpriteAlphaMask,
  type SpriteAuditScope,
} from "../../../spriteAudit";
import { type SpriteFrameRect, snapSpriteFrameRect } from "../../../spriteFrameEditor";
import {
  findDatumSnapTargetsForSpriteFrame,
  type SpriteFrameDatumAnchor,
  type SpriteFrameDatumSnapTarget,
} from "../../../spriteGuideDatums";
import {
  findGuideRegionForSpriteFrame,
  type SpriteFrameGuideRegionContext,
} from "../../../spriteGuideRegions";
import { getSpriteExpectedSourceRect, getSpriteFrameSourceKind } from "../../../spriteSidecar";

export function getSelectedSpriteFrameState(
  document: CanvasDocument,
  selected?: CanvasObject,
):
  | {
      sidecar: SpriteSidecarObject;
      frame: CanvasSpriteFrame;
      image?: ImageObject;
    }
  | undefined {
  if (selected?.kind !== "spriteSidecar" || !selected.spec.selectedFrameId) return undefined;
  const frame = selected.spec.frames.find((entry) => entry.id === selected.spec.selectedFrameId);
  if (!frame) return undefined;
  const image = getSpriteSidecarTarget(document, selected);
  return { sidecar: selected, frame, image };
}

export function getSelectedSpriteFrameGuideRegionContext(
  document: CanvasDocument,
  selected?: CanvasObject,
): SpriteFrameGuideRegionContext | undefined {
  const selectedFrame = getSelectedSpriteFrameState(document, selected);
  if (!selectedFrame) return undefined;
  return findGuideRegionForSpriteFrame(document, {
    spriteSidecarId: selectedFrame.sidecar.id,
    frameId: selectedFrame.frame.id,
  });
}

export function getSelectedSpriteFrameDatumTargets(
  document: CanvasDocument,
  selected: CanvasObject | undefined,
  options?: {
    readonly maxDistance?: number;
    readonly restrictToRegion?: boolean;
  },
): readonly SpriteFrameDatumSnapTarget[] {
  const selectedFrame = getSelectedSpriteFrameState(document, selected);
  if (!selectedFrame) return [];
  return findDatumSnapTargetsForSpriteFrame(document, {
    spriteSidecarId: selectedFrame.sidecar.id,
    frameId: selectedFrame.frame.id,
    options,
  });
}

export function getSpriteCommandApplyContext(
  spriteFrameEditSettings: SpriteFrameEditSettings,
): CanvasCommandApplyContext {
  return {
    spriteFrameEditSettings: {
      constrainFrameEditsToGuideRegion: spriteFrameEditSettings.constrainFrameEditsToGuideRegion,
    },
  };
}

export function getSelectedSpriteFramePreviewModel(options: {
  image?: ImageObject;
  frame: Pick<CanvasSpriteFrame, "x" | "y" | "width" | "height">;
}): { width: number; height: number; style: Record<string, string> } | { reason: string } {
  const { image, frame } = options;
  if (!image?.src) {
    return { reason: "Preview unavailable: missing linked image" };
  }
  const atlasWidth = image.intrinsicWidth ?? image.width;
  const atlasHeight = image.intrinsicHeight ?? image.height;
  if (atlasWidth <= 0 || atlasHeight <= 0) {
    return { reason: "Preview unavailable: missing linked image" };
  }
  const margin = 1;
  const cropWidth = Math.max(1, frame.width + margin * 2);
  const cropHeight = Math.max(1, frame.height + margin * 2);
  const scale = Math.min(6, 192 / Math.max(cropWidth, cropHeight));
  const width = Math.max(72, Math.round(cropWidth * scale));
  const height = Math.max(72, Math.round(cropHeight * scale));
  const offsetX = Math.max(0, frame.x - margin);
  const offsetY = Math.max(0, frame.y - margin);
  return {
    width,
    height,
    style: {
      width: `${width}px`,
      height: `${height}px`,
      backgroundImage: `url("${image.src}")`,
      backgroundRepeat: "no-repeat",
      backgroundSize: `${Math.round(atlasWidth * scale)}px ${Math.round(atlasHeight * scale)}px`,
      backgroundPosition: `-${Math.round(offsetX * scale)}px -${Math.round(offsetY * scale)}px`,
    },
  };
}

export type SpriteAlphaMaskState =
  | { status: "idle" | "loading" }
  | { status: "ready"; mask: SpriteAlphaMask }
  | { status: "unavailable"; reason: string };

export async function loadSpriteAlphaMask(image: ImageObject): Promise<SpriteAlphaMaskState> {
  if (typeof window === "undefined" || typeof document === "undefined") {
    return {
      status: "unavailable",
      reason: "Alpha-aware cut validation unavailable outside the browser runtime.",
    };
  }

  return new Promise((resolve) => {
    const element = new window.Image();
    element.decoding = "async";
    element.crossOrigin = "anonymous";
    element.onload = () => {
      try {
        const width = element.naturalWidth;
        const height = element.naturalHeight;
        if (width <= 0 || height <= 0) {
          resolve({
            status: "unavailable",
            reason:
              "Alpha-aware cut validation unavailable because the image has no readable size.",
          });
          return;
        }
        const canvas = window.document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const context = canvas.getContext("2d", { willReadFrequently: true });
        if (!context) {
          resolve({
            status: "unavailable",
            reason:
              "Alpha-aware cut validation unavailable because the browser could not create a readable canvas context.",
          });
          return;
        }
        context.clearRect(0, 0, width, height);
        context.drawImage(element, 0, 0, width, height);
        const alpha = context.getImageData(0, 0, width, height).data;
        resolve({
          status: "ready",
          mask: {
            width,
            height,
            isOpaque: (x, y) => {
              const ix = Math.trunc(x);
              const iy = Math.trunc(y);
              if (ix < 0 || iy < 0 || ix >= width || iy >= height) return false;
              return alpha[(iy * width + ix) * 4 + 3] > 0;
            },
          },
        });
      } catch (error) {
        resolve({
          status: "unavailable",
          reason:
            error instanceof Error
              ? `Alpha-aware cut validation unavailable for this image. ${error.message}`
              : "Alpha-aware cut validation unavailable for this image.",
        });
      }
    };
    element.onerror = () =>
      resolve({
        status: "unavailable",
        reason: "Alpha-aware cut validation unavailable because the image could not be decoded.",
      });
    element.src = image.src;
  });
}

export function SpriteAuditSectionContent({
  document,
  sidecar,
  image,
}: {
  document: CanvasDocument;
  sidecar: SpriteSidecarObject;
  image: ImageObject;
}) {
  const [scope, setScope] = useState<SpriteAuditScope>("allFrames");
  const [previewVisible, setPreviewVisible] = useState(false);
  const [status, setStatus] = useState("");
  const [artifact, setArtifact] = useState<SpriteAuditArtifact>();
  const [screenshotArtifact, setScreenshotArtifact] = useState<SpriteAuditScreenshotArtifact>();
  const [alphaAuditEnabled, setAlphaAuditEnabled] = useState(true);
  const [alphaThreshold, setAlphaThreshold] = useState(1);
  const [alphaMaskState, setAlphaMaskState] = useState<SpriteAlphaMaskState>({
    status: "idle",
  });

  useEffect(() => {
    if (!alphaAuditEnabled) {
      setAlphaMaskState({ status: "idle" });
      return;
    }
    let cancelled = false;
    setAlphaMaskState({ status: "loading" });
    void loadSpriteAlphaMask(image).then((nextState) => {
      if (!cancelled) setAlphaMaskState(nextState);
    });
    return () => {
      cancelled = true;
    };
  }, [alphaAuditEnabled, image]);

  useEffect(
    () => () => {
      if (screenshotArtifact?.url) {
        URL.revokeObjectURL(screenshotArtifact.url);
      }
    },
    [screenshotArtifact],
  );

  const createArtifact = useCallback(() => {
    const report = buildSpriteAuditReport(sidecar, image, {
      document,
      scope,
      includeAlphaAnalysis: alphaAuditEnabled,
      alphaMask: alphaMaskState.status === "ready" ? alphaMaskState.mask : undefined,
      alphaUnavailableReason:
        alphaMaskState.status === "unavailable"
          ? alphaMaskState.reason
          : alphaMaskState.status === "loading"
            ? "Alpha-aware cut validation still loading image pixels."
            : undefined,
      alphaOptions: { alphaThreshold },
    });
    const nextArtifact = {
      scope,
      report,
      text: formatSpriteAuditReport(report),
    } satisfies SpriteAuditArtifact;
    setArtifact(nextArtifact);
    return nextArtifact;
  }, [alphaAuditEnabled, alphaMaskState, alphaThreshold, document, image, scope, sidecar]);

  const ensureArtifact = useCallback(() => {
    if (artifact && artifact.scope === scope) {
      return artifact;
    }
    return createArtifact();
  }, [artifact, createArtifact, scope]);

  const runAudit = () => {
    const nextArtifact = createArtifact();
    setPreviewVisible(true);
    setStatus(
      `Audit ran for ${formatSpriteAuditScope(scope)}. Found ${nextArtifact.report.summary.totalFindings} suspicious item${nextArtifact.report.summary.totalFindings === 1 ? "" : "s"}.`,
    );
  };

  const previewAudit = () => {
    ensureArtifact();
    setPreviewVisible(true);
    setStatus(`Previewing audit for ${formatSpriteAuditScope(scope)}.`);
  };

  const copyAudit = () => {
    const nextArtifact = ensureArtifact();
    if (!navigator.clipboard?.writeText) {
      setStatus("Clipboard API is unavailable in this browser.");
      return;
    }

    navigator.clipboard
      .writeText(nextArtifact.text)
      .then(() => setStatus("Copied sprite audit report."))
      .catch(() => setStatus("Could not copy sprite audit report."));
  };

  const downloadAudit = () => {
    const nextArtifact = ensureArtifact();
    downloadBlobFile(
      new Blob([nextArtifact.text], { type: "text/markdown" }),
      `${sidecar.id}-sprite-audit.md`,
    );
    setStatus(`Downloaded ${sidecar.id}-sprite-audit.md.`);
  };

  const captureAuditScreenshot = async () => {
    try {
      const nextArtifact = ensureArtifact();
      setStatus("Capturing overlay screenshot...");
      const blob = await lowerCanvasDocumentToRasterBlob(
        createSpriteAuditScreenshotDocument(document, sidecar.id, scope),
        {
          mimeType: "image/png",
          scale: 2,
          background: "#ffffff",
        },
      );
      const url = URL.createObjectURL(blob);
      setScreenshotArtifact((current) => {
        if (current?.url) {
          URL.revokeObjectURL(current.url);
        }
        return {
          path: `${sidecar.id}-sprite-audit-overlay.png`,
          mimeType: "image/png",
          blob,
          size: blob.size,
          url,
        };
      });
      setPreviewVisible(true);
      setStatus(
        `Captured overlay screenshot for ${formatSpriteAuditScope(scope)} with ${nextArtifact.report.summary.totalFindings} suspicious item${nextArtifact.report.summary.totalFindings === 1 ? "" : "s"}.`,
      );
    } catch (caught) {
      setStatus(
        caught instanceof Error ? caught.message : "Overlay screenshot could not be captured.",
      );
    }
  };

  const downloadScreenshot = () => {
    if (!screenshotArtifact) return;
    downloadBlobFile(screenshotArtifact.blob, screenshotArtifact.path);
    setStatus(`Downloaded ${screenshotArtifact.path}.`);
  };

  return (
    <>
      <Field label="Sidecar" value={sidecar.id} />
      <Field label="Image" value={image.id} />
      <label className="sprite-frame-select">
        <span>Audit scope</span>
        <select
          aria-label="Sprite audit scope"
          value={scope}
          onChange={(event) => setScope(event.currentTarget.value as SpriteAuditScope)}
        >
          <option value="allFrames">All frames</option>
          <option value="selectedFrame">Selected frame only</option>
        </select>
      </label>
      <ToggleField
        label="Alpha-aware cut check"
        checked={alphaAuditEnabled}
        onChange={setAlphaAuditEnabled}
      />
      <NumberField
        label="Alpha threshold"
        min={1}
        value={alphaThreshold}
        onChange={(value) => setAlphaThreshold(Math.max(1, Math.round(value)))}
      />
      {alphaAuditEnabled && alphaMaskState.status === "loading" ? (
        <p className="empty-note">Reading image alpha for cut-line checks...</p>
      ) : null}
      {alphaAuditEnabled && alphaMaskState.status === "unavailable" ? (
        <p className="empty-note">{alphaMaskState.reason}</p>
      ) : null}
      <div className="sprite-audit-actions">
        <button type="button" onClick={runAudit}>
          Run audit
        </button>
        <button type="button" onClick={copyAudit}>
          Copy audit report
        </button>
        <button type="button" onClick={previewAudit}>
          Preview audit report
        </button>
        <button type="button" onClick={downloadAudit}>
          Download audit report
        </button>
        <button type="button" onClick={() => void captureAuditScreenshot()}>
          Capture overlay screenshot
        </button>
      </div>
      {status ? <p className="export-status">{status}</p> : null}
      {artifact ? (
        <>
          <div className="validation-result">
            <strong>Audit summary</strong>
            <p>
              {artifact.report.summary.totalFindings} suspicious finding
              {artifact.report.summary.totalFindings === 1 ? "" : "s"} across{" "}
              {artifact.report.summary.totalFrames} frame
              {artifact.report.summary.totalFrames === 1 ? "" : "s"}.
            </p>
            <p>
              {artifact.report.summary.errors} error, {artifact.report.summary.warnings} warning,{" "}
              {artifact.report.summary.notes} note.
            </p>
          </div>
          <div className="validation-result">
            <strong>Likely issues found</strong>
            <ul>
              {artifact.report.likelyIssues.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          </div>
        </>
      ) : null}
      {previewVisible && artifact ? (
        <textarea
          className="export-preview"
          aria-label="Sprite audit report preview"
          readOnly
          value={artifact.text}
        />
      ) : null}
      {screenshotArtifact ? (
        <div className="sprite-audit-preview">
          <img alt="Sprite audit overlay screenshot" src={screenshotArtifact.url} />
          <div className="sprite-audit-preview__meta">
            <p>
              {screenshotArtifact.path} · {formatBlobSize(screenshotArtifact.size)}
            </p>
            {artifact ? <p>{artifact.report.whatToAdjustNext[0]}</p> : null}
            <button type="button" onClick={downloadScreenshot}>
              Download screenshot
            </button>
          </div>
        </div>
      ) : null}
    </>
  );
}

export function formatDatumTargetAnchor(target: SpriteFrameDatumSnapTarget) {
  if (target.datumKind === "point") return "center";
  return target.anchor;
}

export function SelectedSpriteFrameSection({
  sidecar,
  frame,
  image,
  coordinateProfile,
  guideRegionContext,
  datumTargets,
  hasGuideSidecars,
  spriteFrameEditSettings,
  setSpriteFrameEditSettings,
  runCommand,
  zoomToSelected,
}: {
  sidecar: SpriteSidecarObject;
  frame: CanvasSpriteFrame;
  image?: ImageObject;
  coordinateProfile: ReturnType<typeof getCoordinateProfile>;
  guideRegionContext?: SpriteFrameGuideRegionContext;
  datumTargets: readonly SpriteFrameDatumSnapTarget[];
  hasGuideSidecars: boolean;
  spriteFrameEditSettings: SpriteFrameEditSettings;
  setSpriteFrameEditSettings: (settings: SpriteFrameEditSettings) => void;
  runCommand: (command: CanvasCommand) => void;
  zoomToSelected: () => void;
}) {
  const atlasWidth = sidecar.spec.atlasWidth ?? image?.intrinsicWidth;
  const atlasHeight = sidecar.spec.atlasHeight ?? image?.intrinsicHeight;
  const spriteEditStep =
    spriteFrameEditSettings.gridSize > 0 ? spriteFrameEditSettings.gridSize : 1;
  const expectedRect = getSpriteExpectedSourceRect(
    frame,
    sidecar.spec.grids,
    sidecar.spec.stackframes,
  );
  const sourceStackframe =
    frame.sourceStackframeId !== undefined
      ? sidecar.spec.stackframes.find((stackframe) => stackframe.id === frame.sourceStackframeId)
      : undefined;
  const updateRect = (rect: SpriteFrameRect) =>
    runCommand({
      kind: "updateSpriteFrameRect",
      sidecarId: sidecar.id,
      frameId: frame.id,
      rect: snapSpriteFrameRect(rect, {
        enabled: spriteFrameEditSettings.snapToGrid,
        gridSize: spriteFrameEditSettings.gridSize,
      }),
    });
  const auditCount = sidecar.spec.diagnostics.filter((diagnostic) =>
    diagnostic.frameIds?.includes(frame.id),
  ).length;
  const preview = getSelectedSpriteFramePreviewModel({ image, frame });
  const deltaSummary = expectedRect
    ? `${frame.x - expectedRect.x >= 0 ? "+" : ""}${frame.x - expectedRect.x},${
        frame.y - expectedRect.y >= 0 ? "+" : ""
      }${frame.y - expectedRect.y},${frame.width - expectedRect.width >= 0 ? "+" : ""}${
        frame.width - expectedRect.width
      },${frame.height - expectedRect.height >= 0 ? "+" : ""}${frame.height - expectedRect.height}`
    : "No source grid delta";
  const guideDeltaSummary = guideRegionContext?.deltaToRegion
    ? `left ${guideRegionContext.deltaToRegion.left}, top ${guideRegionContext.deltaToRegion.top}, right ${guideRegionContext.deltaToRegion.right}, bottom ${guideRegionContext.deltaToRegion.bottom}`
    : undefined;
  const showGuideConstraintControls = hasGuideSidecars || guideRegionContext !== undefined;
  const guideWarning =
    guideRegionContext?.relation === "intersects"
      ? `${frame.id} partially leaves guide region ${guideRegionContext.regionId}.`
      : guideRegionContext?.relation === "nearest"
        ? `${frame.id} is not inside any guide region.`
        : undefined;
  const hasDatumTargets = datumTargets.length > 0;
  const nearestDatumTarget = datumTargets[0];
  const snapFrameToNearestDatum = (anchor?: SpriteFrameDatumAnchor) =>
    runCommand({
      kind: "snapSpriteFrameToNearestDatum",
      sidecarId: sidecar.id,
      frameId: frame.id,
      anchor,
      maxDistance: spriteFrameEditSettings.datumSnapDistance,
      restrictToRegion: spriteFrameEditSettings.restrictDatumSnapsToGuideRegion,
    });

  return (
    <>
      <div className="sprite-frame-preview-panel">
        <div className="sprite-frame-preview-panel__header">
          <strong>{frame.label}</strong>
          <button onClick={zoomToSelected} type="button">
            Zoom to selected frame
          </button>
        </div>
        {"reason" in preview ? (
          <p className="empty-note">{preview.reason}</p>
        ) : (
          <div className="sprite-frame-preview">
            <div
              aria-label="Selected frame preview"
              className="sprite-frame-preview__crop"
              role="img"
              style={preview.style}
            />
          </div>
        )}
      </div>
      <Field label="Frame ID" value={frame.id} />
      <Field label="Coordinates" value={formatCoordinateProfileSummary(coordinateProfile)} />
      <Field label="Label" value={frame.label} />
      <Field label="Source" value={getSpriteFrameSourceKind(frame)} />
      <Field label="Parent grid" value={frame.sourceGridId ?? "none"} />
      <Field label="Stackframe" value={frame.sourceStackframeId ?? "none"} />
      <Field label="Stack index" value={frame.sourceStackIndex ?? "none"} />
      {sourceStackframe ? (
        <>
          <Field label="Direction" value={sourceStackframe.direction} />
          <Field label="Step" value={sourceStackframe.step} />
        </>
      ) : null}
      <Field
        label="Grid cell"
        value={
          frame.sourceRow !== undefined || frame.sourceColumn !== undefined
            ? `row ${frame.sourceRow ?? "?"}, col ${frame.sourceColumn ?? "?"}`
            : "none"
        }
      />
      <Field label="Sprite" value={frame.spriteId ?? "none"} />
      <Field label="Animation" value={frame.animationId ?? "none"} />
      <Field label="Audit findings" value={auditCount} />
      <Field
        label="Snap"
        value={spriteFrameEditSettings.snapToGrid ? `${spriteFrameEditSettings.gridSize}px` : "off"}
      />
      <Field label="Delta" value={deltaSummary} />
      {guideRegionContext ? (
        <>
          <Field label="Guide region" value={guideRegionContext.regionId} />
          <Field label="Relation" value={guideRegionContext.relation} />
          <Field
            label="Region rect"
            value={`x=${guideRegionContext.regionRect.x} y=${guideRegionContext.regionRect.y} w=${guideRegionContext.regionRect.width} h=${guideRegionContext.regionRect.height}`}
          />
          {guideDeltaSummary ? <Field label="Guide delta" value={guideDeltaSummary} /> : null}
        </>
      ) : null}
      {expectedRect ? (
        <Field
          label="Source rect"
          value={`x=${expectedRect.x} y=${expectedRect.y} w=${expectedRect.width} h=${expectedRect.height}`}
        />
      ) : null}
      <NumberField
        label="Image X"
        min={0}
        onChange={(x) =>
          updateRect({
            x,
            y: frame.y,
            width: frame.width,
            height: frame.height,
          })
        }
        value={frame.x}
      />
      <NumberField
        label="Image Y from top"
        min={0}
        onChange={(y) =>
          updateRect({
            x: frame.x,
            y,
            width: frame.width,
            height: frame.height,
          })
        }
        value={frame.y}
      />
      <NumberField
        label="Width"
        min={1}
        onChange={(width) =>
          updateRect({
            x: frame.x,
            y: frame.y,
            width: Math.max(1, width),
            height: frame.height,
          })
        }
        value={frame.width}
      />
      <NumberField
        label="Height"
        min={1}
        onChange={(height) =>
          updateRect({
            x: frame.x,
            y: frame.y,
            width: frame.width,
            height: Math.max(1, height),
          })
        }
        value={frame.height}
      />
      {showGuideConstraintControls ? (
        <>
          <ToggleField
            checked={spriteFrameEditSettings.constrainFrameEditsToGuideRegion}
            label="Constrain to guide region"
            onChange={(constrainFrameEditsToGuideRegion) =>
              setSpriteFrameEditSettings({
                ...spriteFrameEditSettings,
                constrainFrameEditsToGuideRegion,
              })
            }
          />
          <p className="empty-note">Keeps frame edits inside the selected guide region.</p>
          <button
            className="viewport-wide-button"
            onClick={() =>
              runCommand({
                kind: "clampSpriteFrameToGuideRegion",
                sidecarId: sidecar.id,
                frameId: frame.id,
              })
            }
            type="button"
          >
            Clamp to guide region
          </button>
        </>
      ) : null}
      <div className="inspector-section datum-snapping-section">
        <h3>Datum snapping</h3>
        <Field
          label="Nearest"
          value={
            nearestDatumTarget
              ? `${nearestDatumTarget.datumId} / ${formatDatumTargetAnchor(nearestDatumTarget)} / ${nearestDatumTarget.distance.toFixed(1)}px`
              : "none"
          }
        />
        <NumberField
          label="Snap distance"
          min={0}
          onChange={(datumSnapDistance) =>
            setSpriteFrameEditSettings({
              ...spriteFrameEditSettings,
              datumSnapDistance: Math.max(0, Math.round(datumSnapDistance)),
            })
          }
          value={spriteFrameEditSettings.datumSnapDistance}
        />
        <ToggleField
          checked={spriteFrameEditSettings.restrictDatumSnapsToGuideRegion}
          label="Restrict to frame region"
          onChange={(restrictDatumSnapsToGuideRegion) =>
            setSpriteFrameEditSettings({
              ...spriteFrameEditSettings,
              restrictDatumSnapsToGuideRegion,
            })
          }
        />
        <button
          className="viewport-wide-button"
          onClick={() => snapFrameToNearestDatum()}
          type="button"
        >
          Snap nearest
        </button>
        <div className="command-row sprite-edit-buttons">
          <button onClick={() => snapFrameToNearestDatum("left")} type="button">
            Snap left
          </button>
          <button onClick={() => snapFrameToNearestDatum("right")} type="button">
            Snap right
          </button>
          <button onClick={() => snapFrameToNearestDatum("centerX")} type="button">
            Snap center X
          </button>
          <button onClick={() => snapFrameToNearestDatum("top")} type="button">
            Snap top
          </button>
          <button onClick={() => snapFrameToNearestDatum("bottom")} type="button">
            Snap bottom
          </button>
          <button onClick={() => snapFrameToNearestDatum("centerY")} type="button">
            Snap center Y
          </button>
        </div>
        {hasDatumTargets ? (
          <div className="datum-target-list">
            {datumTargets.slice(0, 5).map((target, index) => (
              <div
                className={`datum-target-card${index === 0 ? " is-nearest" : ""}`}
                key={`${target.guideSidecarId}:${target.datumId}:${target.anchor}`}
              >
                <strong>
                  {target.datumId} / {formatDatumTargetAnchor(target)}
                </strong>
                <p>
                  {target.datumKind} datum · {target.distance.toFixed(1)}px
                  {target.regionId ? ` · region ${target.regionId}` : " · global"}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <p className="empty-note">
            No nearby datums. Add datums in a .guide.toml or increase snap distance.
          </p>
        )}
      </div>
      <ToggleField
        checked={spriteFrameEditSettings.snapToGrid}
        label="Snap frame edits"
        onChange={(snapToGrid) =>
          setSpriteFrameEditSettings({
            ...spriteFrameEditSettings,
            snapToGrid,
          })
        }
      />
      <NumberField
        label="Grid size"
        min={1}
        onChange={(gridSize) =>
          setSpriteFrameEditSettings({
            ...spriteFrameEditSettings,
            gridSize: Math.max(1, Math.round(gridSize)),
          })
        }
        value={spriteFrameEditSettings.gridSize}
      />
      <p className="empty-note">
        x/y must stay at or above 0. width/height must stay above 0.
        {atlasWidth && atlasHeight ? ` Atlas bounds: ${atlasWidth} x ${atlasHeight}.` : ""}
      </p>
      {guideWarning ? <p className="empty-note">{guideWarning}</p> : null}
      {!guideRegionContext && hasGuideSidecars ? (
        <p className="empty-note">No guide region found for this frame.</p>
      ) : null}
      {!guideRegionContext && !hasGuideSidecars ? (
        <p className="empty-note">Attach a .guide.toml to constrain frame edits.</p>
      ) : null}
      <div className="command-row sprite-edit-buttons">
        <button
          onClick={(event) => {
            const [dx, dy] = visualDirectionDelta({
              direction: "left",
              amount: event.shiftKey ? 10 : 1,
              profile: coordinateProfile,
            });
            runCommand({
              kind: "nudgeSpriteFrame",
              sidecarId: sidecar.id,
              frameId: frame.id,
              dx,
              dy,
            });
          }}
          type="button"
        >
          Nudge Left
        </button>
        <button
          onClick={(event) => {
            const [dx, dy] = visualDirectionDelta({
              direction: "right",
              amount: event.shiftKey ? 10 : 1,
              profile: coordinateProfile,
            });
            runCommand({
              kind: "nudgeSpriteFrame",
              sidecarId: sidecar.id,
              frameId: frame.id,
              dx,
              dy,
            });
          }}
          type="button"
        >
          Nudge Right
        </button>
        <button
          onClick={(event) => {
            const [dx, dy] = visualDirectionDelta({
              direction: "up",
              amount: event.shiftKey ? 10 : 1,
              profile: coordinateProfile,
            });
            runCommand({
              kind: "nudgeSpriteFrame",
              sidecarId: sidecar.id,
              frameId: frame.id,
              dx,
              dy,
            });
          }}
          type="button"
        >
          Nudge Up
        </button>
        <button
          onClick={(event) => {
            const [dx, dy] = visualDirectionDelta({
              direction: "down",
              amount: event.shiftKey ? 10 : 1,
              profile: coordinateProfile,
            });
            runCommand({
              kind: "nudgeSpriteFrame",
              sidecarId: sidecar.id,
              frameId: frame.id,
              dx,
              dy,
            });
          }}
          type="button"
        >
          Nudge Down
        </button>
        <button
          onClick={() =>
            runCommand({
              kind: "resizeSpriteFrame",
              sidecarId: sidecar.id,
              frameId: frame.id,
              dw: spriteEditStep,
              dh: 0,
            })
          }
          type="button"
        >
          Grow W
        </button>
        <button
          onClick={() =>
            runCommand({
              kind: "resizeSpriteFrame",
              sidecarId: sidecar.id,
              frameId: frame.id,
              dw: -spriteEditStep,
              dh: 0,
            })
          }
          type="button"
        >
          Shrink W
        </button>
        <button
          onClick={() =>
            runCommand({
              kind: "resizeSpriteFrame",
              sidecarId: sidecar.id,
              frameId: frame.id,
              dw: 0,
              dh: spriteEditStep,
            })
          }
          type="button"
        >
          Grow H
        </button>
        <button
          onClick={() =>
            runCommand({
              kind: "resizeSpriteFrame",
              sidecarId: sidecar.id,
              frameId: frame.id,
              dw: 0,
              dh: -spriteEditStep,
            })
          }
          type="button"
        >
          Shrink H
        </button>
      </div>
    </>
  );
}
