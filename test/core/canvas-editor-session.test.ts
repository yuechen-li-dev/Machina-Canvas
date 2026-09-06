import { describe, expect, it } from "vitest";
import { CanvasEditorSession } from "../../src/core/editor/CanvasEditorSession";
import { applyCanvasCommands } from "../../src/sceneCommands";
import { addImageToEditor } from "../../src/modules/images/controller";
import { addMechanicalNoteToEditor } from "../../src/modules/mechanical/controller";
import { selectSpriteFrameInEditor } from "../../src/modules/sprites/controller";
import { createBlankCanvasScene } from "../../src/sceneTemplates";

function createSession() {
  return new CanvasEditorSession({ document: createBlankCanvasScene() });
}

describe("CanvasEditorSession", () => {
  it("initializes and switches editor modes without React", () => {
    const session = createSession();
    expect(session.getSnapshot().activeModeId).toBeUndefined();

    const state = session.switchMode("sprites");
    expect(state.activeModeId).toBe("sprites");
    expect(state.document.selectedObjectId).toBeDefined();
    expect(state.commandLog).toEqual([]);
  });

  it("runs commands and selection through the semantic session", () => {
    const session = createSession();
    const layerId = session.getSnapshot().document.layers[0].id;
    session.runCommand({
      kind: "addSticker",
      object: {
        id: "session-sticker",
        name: "Session sticker",
        kind: "sticker",
        layerId,
        visible: true,
        x: 10,
        y: 12,
        width: 100,
        height: 40,
        label: "Session",
      },
    });
    const state = session.select("session-sticker");
    expect(state.document.selectedObjectId).toBe("session-sticker");
    expect(state.commandLog).toHaveLength(2);
  });

  it("runs a registered module tool and applies its commands", async () => {
    const session = createSession();
    const state = await session.runTool("create-sticker", {
      options: { id: "tool-sticker", label: "Tool" },
    });
    expect(state.document.objects["tool-sticker"]).toMatchObject({
      kind: "sticker",
      label: "Tool",
    });
    expect(state.lastToolResult?.toolId).toBe("create-sticker");
  });

  it("records but does not reapply an already-applied tool document", async () => {
    const document = createBlankCanvasScene();
    const layerId = document.layers[0].id;
    const command = {
      kind: "addSticker" as const,
      object: {
        id: "already-applied",
        name: "Already applied",
        kind: "sticker" as const,
        layerId,
        visible: true,
        x: 0,
        y: 0,
        width: 80,
        height: 30,
        label: "Once",
      },
    };
    const applied = applyCanvasCommands(document, [command]);
    const session = new CanvasEditorSession({
      document,
      tools: [
        {
          id: "already-applied-tool",
          label: "Already applied",
          description: "Fixture",
          targetKind: "document",
          run: () => ({
            toolId: "already-applied-tool",
            document: applied.document,
            commands: [command],
            commandResults: applied.results,
          }),
        },
      ],
    });

    const state = await session.runTool("already-applied-tool");
    expect(state.document.layers[0].objectIds).toEqual(["already-applied"]);
    expect(state.commandLog).toHaveLength(1);
  });

  it("owns export cart selection and bundle generation", () => {
    const session = createSession();
    const before = session.getSnapshot();
    expect(before.exportArtifacts.length).toBeGreaterThan(0);

    const toggled = session.toggleExportArtifact(before.exportArtifacts[0].id);
    expect(toggled.exportCart.selectedArtifactIds).not.toEqual(
      before.exportCart.selectedArtifactIds,
    );

    const bundled = session.createExportBundle();
    expect(bundled.exportBundle?.files.some((file) => file.path === "document.json")).toBe(true);
  });

  it("runs an image operation through the image controller", () => {
    const session = createSession();
    const layerId = session.getSnapshot().document.layers[0].id;
    const state = addImageToEditor(session, {
      id: "loaded-image",
      name: "Loaded image",
      kind: "image",
      layerId,
      visible: true,
      x: 0,
      y: 0,
      width: 32,
      height: 24,
      src: "data:image/png;base64,AA==",
    });
    expect(state.document.objects["loaded-image"]?.kind).toBe("image");
  });

  it("runs a sprite operation through the sprite controller", () => {
    const session = createSession();
    const initial = session.switchMode("sprites");
    const sidecar = Object.values(initial.document.objects).find(
      (object) => object.kind === "spriteSidecar",
    );
    if (sidecar?.kind !== "spriteSidecar") throw new Error("sprite fixture missing");
    const frame = sidecar.spec.frames[0];

    const state = selectSpriteFrameInEditor(session, sidecar.id, frame.id);
    expect(state.document.objects[sidecar.id]).toMatchObject({
      kind: "spriteSidecar",
      spec: { selectedFrameId: frame.id },
    });
  });

  it("runs a mechanical operation through the mechanical controller", () => {
    const session = createSession();
    const initial = session.switchMode("mechanical");
    const sidecar = Object.values(initial.document.objects).find(
      (object) => object.kind === "mechanicalAnnotationSidecar",
    );
    if (!sidecar) throw new Error("mechanical fixture missing");

    const state = addMechanicalNoteToEditor(session, sidecar.id, {
      id: "session-note",
      kind: "note",
      at: [20, 20],
      text: "Headless note",
    });
    const updated = state.document.objects[sidecar.id];
    expect(updated?.kind).toBe("mechanicalAnnotationSidecar");
    if (updated?.kind !== "mechanicalAnnotationSidecar") throw new Error("sidecar update missing");
    expect(updated.annotations.notes.some((note) => note.id === "session-note")).toBe(true);
  });

  it.each([
    "graphics",
    "webUi",
    "sprites",
    "mechanical",
  ] as const)("drives the %s workflow through the same session boundary", (modeId) => {
    const session = createSession();
    const state = session.switchMode(modeId);
    expect(state.document.layers.length).toBeGreaterThan(0);
    expect(state.exportArtifacts.length).toBeGreaterThan(0);
    expect(session.createExportBundle().exportBundle).toBeDefined();
  });
});
