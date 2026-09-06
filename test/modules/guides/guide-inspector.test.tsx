// @vitest-environment jsdom
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { createCanvasUnitSystem } from "../../../src/canvasUnits";
import { CanvasEditorSession } from "../../../src/core/editor/CanvasEditorSession";
import { addGuideSidecar } from "../../../src/modules/guides/loadActions";
import { guideInspectorContribution } from "../../../src/modules/guides/ui/GuideInspectorContribution";
import type { CanvasDocument } from "../../../src/sceneModel";

function documentWithImage(): CanvasDocument {
  return {
    id: "guide-inspector",
    name: "Guide inspector",
    width: 100,
    height: 80,
    unit: "px",
    unitSystem: createCanvasUnitSystem("px"),
    selectedObjectId: "image",
    layers: [{ id: "layer", name: "Layer", visible: true, objectIds: ["image"] }],
    objects: {
      image: {
        id: "image",
        name: "Image",
        kind: "image",
        layerId: "layer",
        visible: true,
        x: 0,
        y: 0,
        width: 100,
        height: 80,
        src: "/image.png",
      },
    },
  };
}

describe("guide inspector contribution", () => {
  it("supports guide owners and guide or blockout sidecars", () => {
    const image = documentWithImage().objects.image;
    expect(guideInspectorContribution.supports(image)).toBe(true);
    const loaded = addGuideSidecar(
      documentWithImage(),
      { name: "test.guide.toml", text: '[guide]\nid = "test"\nunits = "px"\n' },
      { layerId: "layer", targetId: "image" },
    );
    expect(
      guideInspectorContribution.supports(
        loaded.document.objects[loaded.document.selectedObjectId ?? ""],
      ),
    ).toBe(true);
  });

  it("renders controls and sends guide display commands through the session", () => {
    const loaded = addGuideSidecar(
      documentWithImage(),
      { name: "test.guide.toml", text: '[guide]\nid = "test"\nunits = "px"\n' },
      { layerId: "layer", targetId: "image" },
    );
    const session = new CanvasEditorSession({ document: loaded.document });
    const object = loaded.document.objects[loaded.document.selectedObjectId ?? ""];
    render(
      guideInspectorContribution.renderPanels?.({
        document: loaded.document,
        object,
        runCommand: (command) => session.runCommand(command),
        panel: { contextKey: "guide", isOpen: () => true, setOpen: () => {} },
      }),
    );
    fireEvent.click(screen.getByRole("button", { name: "Hide Guide Overlay" }));
    expect(session.getSnapshot().document.objects[object.id]).toMatchObject({ visible: false });
    fireEvent.click(screen.getByRole("checkbox", { name: "Guide labels" }));
    expect(session.getSnapshot().document.objects[object.id]).toMatchObject({ showLabels: false });
    expect(screen.getByRole("button", { name: "Lower opacity" })).toBeTruthy();
  });
});
