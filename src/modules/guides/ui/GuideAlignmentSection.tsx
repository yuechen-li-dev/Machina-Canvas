import { useEffect, useState } from "react";
import { Field, InspectorSection } from "../../../app/inspector/shared";
import {
  type ResolvedGuideAlignmentMark,
  resolveGuideAlignmentMarks,
  validateGuideAlignmentMarks,
} from "../../../guideAlignment";
import type { CanvasCommand } from "../../../sceneCommands";
import type { CanvasDocument } from "../../../sceneModel";

export function getGuideAlignmentSourceMarks(
  document: CanvasDocument,
  sourceObjectId: string,
  sourceGuideSidecarId?: string,
): readonly ResolvedGuideAlignmentMark[] {
  return resolveGuideAlignmentMarks(document).filter(
    (mark) =>
      mark.targetObjectId === sourceObjectId &&
      (sourceGuideSidecarId === undefined || mark.guideSidecarId === sourceGuideSidecarId),
  );
}

export function GuideAlignmentSection({
  document,
  sourceObjectId,
  sourceGuideSidecarId,
  runCommand,
}: {
  document: CanvasDocument;
  sourceObjectId: string;
  sourceGuideSidecarId?: string;
  runCommand: (command: CanvasCommand) => void;
}) {
  const resolvedMarks = resolveGuideAlignmentMarks(document);
  const sourceMarks = getGuideAlignmentSourceMarks(document, sourceObjectId, sourceGuideSidecarId);
  const diagnostics = validateGuideAlignmentMarks(document);
  const [sourceMarkId, setSourceMarkId] = useState("");
  const [targetObjectId, setTargetObjectId] = useState("");
  const [targetMarkId, setTargetMarkId] = useState("");

  const targetObjects = Array.from(
    new Set(
      resolvedMarks
        .map((mark) => mark.targetObjectId)
        .filter((objectId) => objectId !== sourceObjectId || resolvedMarks.length === 1),
    ),
  );
  const targetMarks = resolvedMarks.filter((mark) => mark.targetObjectId === targetObjectId);

  useEffect(() => {
    const nextSourceMarkId = sourceMarks[0]?.markId ?? "";
    setSourceMarkId(nextSourceMarkId);

    const preferredTargetObjectId =
      targetObjects.find((objectId) => objectId !== sourceObjectId) ?? targetObjects[0] ?? "";
    setTargetObjectId(preferredTargetObjectId);

    const nextTargetMarkId =
      resolvedMarks.find((mark) => mark.targetObjectId === preferredTargetObjectId)?.markId ?? "";
    setTargetMarkId(nextTargetMarkId);
  }, [resolvedMarks, sourceMarks, sourceObjectId, targetObjects]);

  useEffect(() => {
    const nextTargetMarkId =
      resolvedMarks.find((mark) => mark.targetObjectId === targetObjectId)?.markId ?? "";
    setTargetMarkId((current) =>
      current && targetMarks.some((mark) => mark.markId === current) ? current : nextTargetMarkId,
    );
  }, [resolvedMarks, targetMarks, targetObjectId]);

  return (
    <InspectorSection title="Alignment marks">
      <Field label="Mark count" value={sourceMarks.length} />
      {sourceMarks.length > 0 ? (
        <div className="datum-target-list">
          {sourceMarks.map((mark) => (
            <div className="datum-target-card" key={`${mark.guideSidecarId}:${mark.markId}`}>
              <strong>{mark.label ?? mark.markId}</strong>
              <p>
                {`${mark.targetObjectId} @ ${mark.scene.x.toFixed(1)}, ${mark.scene.y.toFixed(1)}`}
              </p>
            </div>
          ))}
        </div>
      ) : (
        <p className="empty-note">No resolved source marks for this image.</p>
      )}
      <label className="sprite-frame-select">
        <span>Source mark</span>
        <select
          aria-label="Source alignment mark"
          value={sourceMarkId}
          onChange={(event) => setSourceMarkId(event.currentTarget.value)}
        >
          {sourceMarks.length === 0 ? <option value="">No marks</option> : null}
          {sourceMarks.map((mark) => (
            <option key={`${mark.guideSidecarId}:${mark.markId}`} value={mark.markId}>
              {`${mark.label ?? mark.markId} (${mark.scene.x.toFixed(1)}, ${mark.scene.y.toFixed(1)})`}
            </option>
          ))}
        </select>
      </label>
      <label className="sprite-frame-select">
        <span>Target object</span>
        <select
          aria-label="Target alignment object"
          value={targetObjectId}
          onChange={(event) => setTargetObjectId(event.currentTarget.value)}
        >
          {targetObjects.length === 0 ? <option value="">No targets</option> : null}
          {targetObjects.map((objectId) => (
            <option key={objectId} value={objectId}>
              {objectId}
            </option>
          ))}
        </select>
      </label>
      <label className="sprite-frame-select">
        <span>Target mark</span>
        <select
          aria-label="Target alignment mark"
          value={targetMarkId}
          onChange={(event) => setTargetMarkId(event.currentTarget.value)}
        >
          {targetMarks.length === 0 ? <option value="">No marks</option> : null}
          {targetMarks.map((mark) => (
            <option key={`${mark.guideSidecarId}:${mark.markId}`} value={mark.markId}>
              {`${mark.label ?? mark.markId} (${mark.scene.x.toFixed(1)}, ${mark.scene.y.toFixed(1)})`}
            </option>
          ))}
        </select>
      </label>
      <div className="command-row">
        <button
          type="button"
          disabled={!sourceMarkId || !targetObjectId || !targetMarkId}
          onClick={() =>
            runCommand({
              kind: "alignObjectByGuideMarks",
              sourceObjectId,
              sourceMarkId,
              targetObjectId,
              targetMarkId,
              sourceGuideSidecarId,
            })
          }
        >
          Align to mark
        </button>
      </div>
      {diagnostics.length > 0 ? (
        <div className="validation-result is-warning">
          <strong>Alignment diagnostics</strong>
          <ul>
            {diagnostics.slice(0, 6).map((diagnostic, index) => (
              <li key={`${diagnostic.code}-${diagnostic.alignmentMarkId ?? index}`}>
                <span>{diagnostic.code}</span>
                {`: ${diagnostic.message}`}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </InspectorSection>
  );
}
