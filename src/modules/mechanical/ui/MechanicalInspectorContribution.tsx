import type { CanvasInspectorContribution } from "../../../app/inspectorContributions";
import { InspectorAccordionGroup } from "../../../InspectorAccordionGroup";
import {
  getMechanicalInspectorSummary,
  validateMechanicalAnnotationsForScene,
} from "../../../mechanicalAnnotations";

function Field({ label, value }: { readonly label: string; readonly value: unknown }) {
  return (
    <div className="field-row">
      <span>{label}</span>
      <strong>{String(value)}</strong>
    </div>
  );
}

export const mechanicalInspectorContribution: CanvasInspectorContribution = {
  id: "mechanical.annotations",
  order: 50,
  supports: (object) => object.kind === "mechanicalAnnotationSidecar",
  renderPanels({ document, object, panel }) {
    if (object.kind !== "mechanicalAnnotationSidecar") return null;
    const diagnostics = validateMechanicalAnnotationsForScene(document, object);
    const summary = getMechanicalInspectorSummary(document, object);
    return (
      <InspectorAccordionGroup
        id="sprite-sidecar"
        key={`${panel.contextKey}:mechanical-sidecar`}
        onOpenChange={(open) => panel.setOpen("sprite-sidecar", open)}
        open={panel.isOpen("sprite-sidecar")}
        subtitle={`${object.annotations.dimensions.length} dimensions`}
        title="Mechanical annotations"
      >
        <Field label="Target object" value={object.targetObjectId ?? "canvas"} />
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
              {summary.dimensionReferenceSummaries.flatMap((entry) =>
                entry.references.map((reference) => (
                  <li key={`${entry.dimensionId}-${reference.objectId}-${reference.anchor}`}>
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
        <div className={`validation-result ${diagnostics.length ? "is-error" : "is-ok"}`}>
          <strong>Mechanical annotation diagnostics</strong>
          {diagnostics.length ? (
            <ul>
              {diagnostics.map((diagnostic) => (
                <li key={`${diagnostic.code}-${diagnostic.message}`}>
                  <span>{diagnostic.code}</span>: {diagnostic.message}
                </li>
              ))}
            </ul>
          ) : (
            <p>No findings.</p>
          )}
        </div>
      </InspectorAccordionGroup>
    );
  },
};
