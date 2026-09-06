import { describe, expect, it } from "vitest";
import { CanvasEditorAsyncCoordinator } from "../../../src/app/async/CanvasEditorAsyncCoordinator";
import type {
  BrowserExportService,
  BrowserFileService,
} from "../../../src/app/browser/BrowserEditorServices";
import { createCanvasUnitSystem } from "../../../src/canvasUnits";
import { CanvasEditorSession } from "../../../src/core/editor/CanvasEditorSession";
import { addGuideSidecar } from "../../../src/modules/guides/loadActions";
import type { CanvasDocument } from "../../../src/sceneModel";

const guideToml = `[guide]\nid = "loaded-guide"\ntarget = "image"\nunits = "px"\n`;

function createDocument(): CanvasDocument {
  return {
    id: "guide-load-selection",
    name: "Guide load selection",
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
        role: "image",
      },
    },
  };
}

function createExports(): BrowserExportService {
  return {
    copyText: async () => {},
    download: () => {},
    checkout: async () => ({ kind: "ok", artifactCount: 0, filenames: [] }),
  };
}

describe("guide sidecar load selection", () => {
  it("selects the exact newly attached guide through the browser and session boundary", async () => {
    const firstLoad = addGuideSidecar(
      createDocument(),
      { name: "image.guide.toml", text: guideToml },
      { layerId: "layer", targetId: "image" },
    );
    const document = { ...firstLoad.document, selectedObjectId: "image" };
    const readFiles: string[] = [];
    const files: BrowserFileService = {
      readText: async (file) => {
        readFiles.push(file.name);
        return { name: file.name, text: guideToml };
      },
      readImage: async () => {
        throw new Error("The guide load path must not read an image.");
      },
    };
    const session = new CanvasEditorSession({ document });
    const coordinator = new CanvasEditorAsyncCoordinator({
      session,
      files,
      exports: createExports(),
    });

    const result = await coordinator.loadGuideSidecar({ name: "image.guide.toml" } as File, {
      document,
      layerId: "layer",
      targetId: "image",
    });

    expect(result.kind).toBe("ok");
    if (result.kind !== "ok") return;

    const newGuideId = "image-guide-sidecar-2";
    expect(readFiles).toEqual(["image.guide.toml"]);
    expect(result.value.document.selectedObjectId).toBe(newGuideId);
    expect(session.getSnapshot().document.selectedObjectId).toBe(newGuideId);
    expect(session.getSnapshot().document.objects[newGuideId]).toMatchObject({
      kind: "guideSidecar",
      targetId: "image",
    });
  });
});
