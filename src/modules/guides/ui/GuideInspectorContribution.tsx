import { ToggleField } from "../../../app/inspector/shared";
import type { CanvasInspectorContribution } from "../../../app/inspectorContributions";
import { validateBlockoutSidecar } from "../../../blockoutSidecar";
import { validateGuideAlignmentMarks } from "../../../guideAlignment";
import { validateGuideSidecar } from "../../../guideSidecar";
import { InspectorAccordionGroup } from "../../../InspectorAccordionGroup";
import type { ImageObject } from "../../../sceneModel";
import { GuideAlignmentSection } from "./GuideAlignmentSection";

function Field({ label, value }: { readonly label: string; readonly value: unknown }) {
  return (
    <div className="field-row">
      <span>{label}</span>
      <strong>{String(value)}</strong>
    </div>
  );
}

export const guideInspectorContribution: CanvasInspectorContribution = {
  id: "guides.sidecar",
  order: 40,
  supports: (object) =>
    object.kind === "image" || object.kind === "guideSidecar" || object.kind === "blockoutSidecar",
  renderPanels({ document, object, panel, runCommand }) {
    if (object.kind === "image") {
      return (
        <InspectorAccordionGroup
          id="alignment"
          key={`${panel.contextKey}:alignment`}
          onOpenChange={(open) => panel.setOpen("alignment", open)}
          open={panel.isOpen("alignment")}
          title="Alignment"
        >
          <GuideAlignmentSection
            document={document}
            runCommand={runCommand}
            sourceObjectId={object.id}
          />
        </InspectorAccordionGroup>
      );
    }
    if (object.kind === "guideSidecar") {
      const targetImage =
        object.targetId && document.objects[object.targetId]?.kind === "image"
          ? (document.objects[object.targetId] as ImageObject)
          : undefined;
      const diagnostics = [
        ...validateGuideSidecar(object.guide, {
          imageWidth: targetImage?.intrinsicWidth ?? targetImage?.width,
          imageHeight: targetImage?.intrinsicHeight ?? targetImage?.height,
        }),
        ...validateGuideAlignmentMarks(document).filter((diagnostic) =>
          object.guide.alignmentMarks.some((mark) => mark.id === diagnostic.alignmentMarkId),
        ),
      ];
      return (
        <InspectorAccordionGroup
          id="sprite-sidecar"
          key={`${panel.contextKey}:guide-sidecar`}
          onOpenChange={(open) => panel.setOpen("sprite-sidecar", open)}
          open={panel.isOpen("sprite-sidecar")}
          subtitle={`${object.guide.regions.length} regions · ${object.guide.datums.length} datums · ${object.guide.dimensions.length} dimensions · ${object.guide.alignmentMarks.length} marks`}
          title="Guide sidecar"
        >
          <Field label="Attached owner" value={object.targetId ?? "unattached"} />
          <Field label="Visible" value={object.visible ? "yes" : "no"} />
          <Field label="Opacity" value={object.opacity ?? 0.9} />
          <Field label="Units" value={object.guide.units} />
          <Field label="Regions" value={object.guide.regions.length} />
          <Field label="Datums" value={object.guide.datums.length} />
          <Field label="Dimensions" value={object.guide.dimensions.length} />
          <Field label="Alignment marks" value={object.guide.alignmentMarks.length} />
          <Field label="Validation findings" value={diagnostics.length} />
          {object.guide.description ? (
            <Field label="Description" value={object.guide.description} />
          ) : null}
          {targetImage ? (
            <GuideAlignmentSection
              document={document}
              runCommand={runCommand}
              sourceGuideSidecarId={object.id}
              sourceObjectId={targetImage.id}
            />
          ) : null}
          <div className="command-row">
            <button
              type="button"
              onClick={() =>
                runCommand({
                  kind: "setGuideSidecarVisible",
                  guideId: object.id,
                  visible: !object.visible,
                })
              }
            >
              {object.visible ? "Hide Guide Overlay" : "Show Guide Overlay"}
            </button>
            <button
              disabled={!object.targetId}
              type="button"
              onClick={() => runCommand({ kind: "detachGuideSidecar", guideId: object.id })}
            >
              Detach Guide Sidecar
            </button>
          </div>
          <ToggleField
            checked={object.showLabels ?? true}
            label="Guide labels"
            onChange={(showLabels) =>
              runCommand({
                kind: "setGuideSidecarShowLabels",
                guideId: object.id,
                showLabels,
              })
            }
          />
          <div className="command-row">
            <button
              type="button"
              onClick={() =>
                runCommand({
                  kind: "setGuideSidecarOpacity",
                  guideId: object.id,
                  opacity: Math.max(0.15, Math.min(1, (object.opacity ?? 0.9) - 0.15)),
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
                  guideId: object.id,
                  opacity: Math.max(0.15, Math.min(1, (object.opacity ?? 0.9) + 0.15)),
                })
              }
            >
              Raise opacity
            </button>
          </div>
          <div className={`validation-result ${diagnostics.length ? "is-error" : "is-ok"}`}>
            <strong>Guide validation</strong>
            {diagnostics.length ? (
              <ul>
                {diagnostics.map((diagnostic) => (
                  <li key={`${diagnostic.code}-${diagnostic.message}`}>
                    <span>{diagnostic.code}</span>: {diagnostic.message}
                  </li>
                ))}
              </ul>
            ) : (
              <p>No guide findings.</p>
            )}
          </div>
        </InspectorAccordionGroup>
      );
    }

    if (object.kind !== "blockoutSidecar") return null;
    const target = object.targetObjectId ? document.objects[object.targetObjectId] : undefined;
    const diagnostics = validateBlockoutSidecar(object.blockout);
    return (
      <InspectorAccordionGroup
        id="sprite-sidecar"
        key={`${panel.contextKey}:blockout-sidecar`}
        onOpenChange={(open) => panel.setOpen("sprite-sidecar", open)}
        open={panel.isOpen("sprite-sidecar")}
        subtitle={`${object.blockout.boxes.length} boxes`}
        title="Blockout sidecar"
      >
        <Field label="Target object" value={object.targetObjectId ?? "unattached"} />
        <Field label="Visible" value={object.visible ? "yes" : "no"} />
        <Field label="Opacity" value={object.opacity ?? 0.72} />
        <Field label="Boxes" value={object.blockout.boxes.length} />
        <Field label="Points" value={object.blockout.points.length} />
        <Field label="Curves" value={object.blockout.curves.length} />
        <Field label="Diagnostics" value={diagnostics.length} />
        {object.blockout.description ? (
          <Field label="Description" value={object.blockout.description} />
        ) : null}
        {target ? <Field label="Owner" value={target.name} /> : null}
        <div className="command-row">
          <button
            type="button"
            onClick={() =>
              runCommand({
                kind: "setBlockoutSidecarVisible",
                blockoutId: object.id,
                visible: !object.visible,
              })
            }
          >
            {object.visible ? "Hide Blockout Overlay" : "Show Blockout Overlay"}
          </button>
          <button
            disabled={!object.targetObjectId}
            type="button"
            onClick={() => runCommand({ kind: "detachBlockoutSidecar", blockoutId: object.id })}
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
                blockoutId: object.id,
                opacity: Math.max(0.15, Math.min(1, (object.opacity ?? 0.72) - 0.15)),
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
                blockoutId: object.id,
                opacity: Math.max(0.15, Math.min(1, (object.opacity ?? 0.72) + 0.15)),
              })
            }
          >
            Raise opacity
          </button>
        </div>
        <div className={`validation-result ${diagnostics.length ? "is-error" : "is-ok"}`}>
          <strong>Blockout validation</strong>
          {diagnostics.length ? (
            <ul>
              {diagnostics.map((diagnostic) => (
                <li key={`${diagnostic.code}-${diagnostic.message}`}>
                  <span>{diagnostic.code}</span>: {diagnostic.message}
                </li>
              ))}
            </ul>
          ) : (
            <p>No blockout findings.</p>
          )}
        </div>
      </InspectorAccordionGroup>
    );
  },
};
