// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { createCanvasUnitSystem } from "../../../src/canvasUnits";
import { addMechanicalAnnotationSidecar } from "../../../src/modules/mechanical/loadActions";
import { mechanicalInspectorContribution } from "../../../src/modules/mechanical/ui/MechanicalInspectorContribution";
import type { CanvasDocument } from "../../../src/sceneModel";

function createDocument(): CanvasDocument {
  return {
    id: "mechanical-inspector",
    name: "Mechanical inspector",
    width: 297,
    height: 210,
    unit: "mm",
    unitSystem: createCanvasUnitSystem("mm"),
    layers: [{ id: "layer", name: "Layer", visible: true, objectIds: [] }],
    objects: {},
  };
}

describe("mechanical inspector contribution", () => {
  it("owns mechanical support and renders current sheet facts and diagnostics", () => {
    const loaded = addMechanicalAnnotationSidecar(createDocument(), {
      layerId: "layer",
      useDefaultSheet: true,
    });
    const object = loaded.document.objects[loaded.document.selectedObjectId ?? ""];
    expect(mechanicalInspectorContribution.supports(object)).toBe(true);
    render(
      mechanicalInspectorContribution.renderPanels?.({
        document: loaded.document,
        object,
        runCommand: () => {},
        panel: { contextKey: "mechanical", isOpen: () => true, setOpen: () => {} },
      }),
    );
    expect(screen.getByText("Mechanical annotations")).toBeTruthy();
    expect(screen.getByText("Mechanical annotation diagnostics")).toBeTruthy();
    expect(screen.getByText("A4 landscape")).toBeTruthy();
  });
});
