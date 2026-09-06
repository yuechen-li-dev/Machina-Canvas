import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import {
  type CanvasObjectRenderContext,
  canvasObjectRendererContributions,
  canvasOverlayContributions,
  renderCanvasModuleObject,
  renderCanvasModuleOverlays,
} from "../../../src/app/canvas/objectContributions";
import { renderCanvasModuleInspector } from "../../../src/app/inspectorContributions";
import { createCanvasExportBundle } from "../../../src/canvasExport";
import { canvasModules } from "../../../src/modules";
import { stickerExportContribution } from "../../../src/modules/stickers/export";
import { CREATE_STICKER_TOOL_ID } from "../../../src/modules/stickers/tool";
import { applyCanvasCommands, validateCanvasCommands } from "../../../src/sceneCommands";
import type { StickerObject } from "../../../src/sceneModel";
import { canvasTools, runCanvasTool } from "../../../src/tools";
import { createStickerFixtureDocument, stickerFixture } from "./fixture";

describe("Sticker module", () => {
  it("owns a strongly discriminated sticker record", () => {
    const object: StickerObject = stickerFixture;

    expect(object.kind).toBe("sticker");
    expect(object.label).toBe("Alpha");
    expect(createStickerFixtureDocument({ [object.id]: object }).objects[object.id]).toBe(object);
  });

  it("validates and applies its typed commands through the public command path", () => {
    const emptyDocument = createStickerFixtureDocument();
    const invalid = validateCanvasCommands(emptyDocument, {
      kind: "addSticker",
      object: { ...stickerFixture, layerId: "missing" },
    });

    expect(invalid).toMatchObject({
      ok: false,
      diagnostics: [{ code: "MissingLayer", commandIndex: 0 }],
    });

    const added = applyCanvasCommands(emptyDocument, [
      { kind: "addSticker", object: stickerFixture },
    ]);
    expect(added.document.objects[stickerFixture.id]).toEqual(stickerFixture);
    expect(added.document.layers[0]?.objectIds).toEqual([stickerFixture.id]);
    expect(added.document.selectedObjectId).toBe(stickerFixture.id);
    expect(emptyDocument.objects).toEqual({});

    const renamed = applyCanvasCommands(added.document, [
      { kind: "renameSticker", id: stickerFixture.id, label: "Reviewed" },
    ]);
    expect(renamed.document.objects[stickerFixture.id]).toMatchObject({
      name: "Reviewed",
      label: "Reviewed",
    });
    expect(added.document.objects[stickerFixture.id]).toEqual(stickerFixture);
    expect(
      validateCanvasCommands(renamed.document, {
        kind: "renameSticker",
        id: stickerFixture.id,
        label: "  ",
      }).diagnostics[0]?.code,
    ).toBe("InvalidStickerLabel");
  });

  it("runs its registered headless tool and returns an applicable command", async () => {
    const document = createStickerFixtureDocument();
    const result = await runCanvasTool(
      canvasTools,
      CREATE_STICKER_TOOL_ID,
      {
        options: {
          id: "tool-sticker",
          label: "From tool",
          layerId: "notes",
          x: 30,
        },
      },
      { document },
    );

    expect(result.createdObjectIds).toEqual(["tool-sticker"]);
    expect(result.commands).toHaveLength(1);
    const applied = applyCanvasCommands(document, result.commands ?? []);
    expect(applied.document.objects["tool-sticker"]).toMatchObject({
      kind: "sticker",
      label: "From tool",
      layerId: "notes",
      x: 30,
    });
  });

  it("renders its object and selected overlay through the registered canvas contributions", () => {
    const onSelect = vi.fn();
    const context: CanvasObjectRenderContext = {
      document: createStickerFixtureDocument({ [stickerFixture.id]: stickerFixture }),
      object: stickerFixture,
      selected: true,
      onSelect,
      commonSvgProps: {
        "data-canvas-object-id": stickerFixture.id,
        "data-canvas-kind": stickerFixture.kind,
        "data-canvas-name": stickerFixture.name,
        onClick: () => onSelect(stickerFixture.id),
      },
    };

    const { container } = render(
      <svg>
        <title>Sticker contribution proof</title>
        {renderCanvasModuleObject(context)}
        {renderCanvasModuleOverlays(context)}
      </svg>,
    );

    expect(canvasObjectRendererContributions.map((contribution) => contribution.id)).toContain(
      "stickers.renderer",
    );
    expect(canvasOverlayContributions.map((contribution) => contribution.id)).toContain(
      "stickers.selected-label-overlay",
    );
    expect(container.querySelector('[data-canvas-object-id="sticker-alpha"]')).not.toBeNull();
    expect(
      container.querySelector('[data-canvas-overlay-id="stickers.selected-label-overlay"]')
        ?.textContent,
    ).toBe("Sticker: Alpha");

    const unselectedContainer = render(
      <svg>
        <title>Unselected sticker contribution proof</title>
        {renderCanvasModuleOverlays({ ...context, selected: false })}
      </svg>,
    ).container;
    expect(
      unselectedContainer.querySelector(
        '[data-canvas-overlay-id="stickers.selected-label-overlay"]',
      ),
    ).toBeNull();
  });

  it("renders and edits through the registered inspector contribution", () => {
    const runCommand = vi.fn();
    const stickerModule = canvasModules.find((module) => module.id === "stickers");

    render(renderCanvasModuleInspector({ object: stickerFixture, runCommand }));
    expect(stickerModule?.inspectors).toContain("stickers.label");

    fireEvent.change(screen.getByLabelText("Sticker label"), {
      target: { value: "Edited" },
    });
    expect(runCommand).toHaveBeenCalledWith({
      kind: "renameSticker",
      id: stickerFixture.id,
      label: "Edited",
    });
  });

  it("contributes a deterministic sticker artifact to the real export bundle", () => {
    const laterSticker: StickerObject = {
      ...stickerFixture,
      id: "sticker-zulu",
      name: "Zulu",
      label: "Zulu",
      src: "data:image/svg+xml,zulu",
    };
    const document = createStickerFixtureDocument({
      [laterSticker.id]: laterSticker,
      [stickerFixture.id]: stickerFixture,
    });
    const directArtifacts = stickerExportContribution.collect(document);
    const bundle = createCanvasExportBundle(document);
    const artifact = bundle.files.find((candidate) => candidate.path === "stickers/stickers.json");

    expect(directArtifacts).toEqual([artifact]);
    expect(JSON.parse(artifact?.text ?? "{}")).toEqual({
      stickers: [
        {
          id: "sticker-alpha",
          label: "Alpha",
          frame: { x: 12, y: 18, width: 96, height: 40 },
        },
        {
          id: "sticker-zulu",
          label: "Zulu",
          frame: { x: 12, y: 18, width: 96, height: 40 },
          src: "data:image/svg+xml,zulu",
        },
      ],
    });
  });
});
