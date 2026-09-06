import { describe, expect, it } from "vitest";
import { CanvasEditorAsyncCoordinator } from "../../src/app/async/CanvasEditorAsyncCoordinator";
import type {
  BrowserExportService,
  BrowserFileService,
} from "../../src/app/browser/BrowserEditorServices";
import { createCanvasUnitSystem } from "../../src/canvasUnits";
import { createCanvasViewport } from "../../src/canvasViewport";
import { CanvasEditorSession } from "../../src/core/editor/CanvasEditorSession";
import { collectCanvasExportArtifacts, createExportCart } from "../../src/exportCart";
import type { LoadedImageAsset } from "../../src/imageAssets";
import { getSceneGeometryDiagnostics } from "../../src/sceneGeometry";
import type { CanvasDocument } from "../../src/sceneModel";

const imageAsset: LoadedImageAsset = {
  id: "loaded",
  name: "Loaded",
  fileName: "loaded.png",
  mimeType: "image/png",
  src: "data:image/png;base64,AA==",
  intrinsicWidth: 32,
  intrinsicHeight: 24,
};

const guideToml = `[guide]\nid = "guide"\ntarget = "image"\nunits = "px"\n`;
const blockoutToml = `[blockout]\nid = "blockout"\nname = "Blockout"\n`;
const spriteToml = `[atlas]\nimage = "image.png"\nwidth = 100\nheight = 80\n`;

function createDocument(): CanvasDocument {
  return {
    id: "coordinator",
    name: "Coordinator",
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

function createHarness(text = guideToml) {
  const document = createDocument();
  const downloads: string[] = [];
  const copied: string[] = [];
  const files: BrowserFileService = {
    readText: async (file) => ({ name: file.name, text }),
    readImage: async () => imageAsset,
  };
  const exports: BrowserExportService = {
    copyText: async (value) => {
      copied.push(value);
    },
    download: (filename) => {
      downloads.push(filename);
    },
    checkout: async (mode, entries, manifest) => {
      if (mode === "copyText") {
        await exports.copyText(entries.map((entry) => String(entry.payload)).join("\n"));
      } else {
        for (const entry of entries) exports.download(entry.filename, entry.payload);
      }
      return {
        kind: "ok",
        artifactCount: entries.length,
        filenames: entries.map((entry) => entry.filename),
        manifest,
      };
    },
  };
  const session = new CanvasEditorSession({ document });
  return {
    coordinator: new CanvasEditorAsyncCoordinator({ session, files, exports }),
    document,
    downloads,
    session,
  };
}

function file(name: string): File {
  return { name } as File;
}

function loadContext(document: CanvasDocument, targetId = "image") {
  return { document, layerId: "layer", targetId };
}

describe("CanvasEditorAsyncCoordinator", () => {
  it("loads and selects an image through the image module", async () => {
    const { coordinator, document } = createHarness();
    const result = await coordinator.loadImage(file("loaded.png"), {
      ...loadContext(document),
      role: "image",
    });
    expect(result.kind).toBe("ok");
    if (result.kind === "ok") expect(result.value.document.selectedObjectId).toBe("loaded");
  });

  it.each([
    ["sprite", spriteToml, "loadSpriteSidecar", "spriteSidecar"],
    ["guide", guideToml, "loadGuideSidecar", "guideSidecar"],
    ["blockout", blockoutToml, "loadBlockoutSidecar", "blockoutSidecar"],
  ] as const)("loads and selects a %s sidecar", async (_label, text, method, kind) => {
    const { coordinator, document, session } = createHarness(text);
    const result = await coordinator[method](file(`${kind}.toml`), loadContext(document));
    expect(result.kind).toBe("ok");
    const selected = session.getSnapshot().document.selectedObjectId;
    expect(session.getSnapshot().document.objects[selected ?? ""]?.kind).toBe(kind);
  });

  it("creates and selects mechanical annotations through the mechanical module", async () => {
    const { coordinator, document } = createHarness();
    const result = await coordinator.createMechanicalSidecar({
      ...loadContext(document),
      useDefaultSheet: true,
    });
    expect(result.kind).toBe("ok");
    if (result.kind === "ok") {
      expect(
        result.value.document.objects[result.value.document.selectedObjectId ?? ""]?.kind,
      ).toBe("mechanicalAnnotationSidecar");
    }
  });

  it("constructs and validates semantic exports without browser IO", () => {
    const { coordinator, document } = createHarness();
    const result = coordinator.generateExport({
      document,
      viewport: createCanvasViewport(document),
      diagnostics: getSceneGeometryDiagnostics(document),
      tsx: false,
    });
    expect(result.kind).toBe("ok");
    if (result.kind === "ok") expect(result.value.bundle.files.length).toBeGreaterThan(0);
  });

  it("materializes checkout entries through the injected browser service", async () => {
    const { coordinator, document, downloads } = createHarness();
    const artifacts = collectCanvasExportArtifacts({ scene: document });
    const result = await coordinator.checkout({
      artifacts,
      cart: createExportCart(artifacts),
    });
    expect(result.kind).toBe("ok");
    expect(downloads.length).toBeGreaterThan(0);
  });

  it("keeps checkpoint materialization on the browser boundary", async () => {
    const { coordinator, document, downloads } = createHarness();
    const result = await coordinator.checkpoint({ document, message: "save" });
    expect(result.kind).toBe("ok");
    expect(downloads.some((name) => name.endsWith(".mcanvas-checkpoint.json"))).toBe(true);
  });
});
