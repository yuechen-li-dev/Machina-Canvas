import { fireEvent, render, screen } from "@testing-library/react";
import { useState, useSyncExternalStore } from "react";
import { describe, expect, it } from "vitest";
import { SceneObjectSvg } from "../../../src/app/canvas/SceneObjectRenderer";
import { renderCanvasModuleInspector } from "../../../src/app/inspectorContributions";
import { CanvasEditorSession } from "../../../src/core/editor/CanvasEditorSession";
import { createStickerFixtureDocument, stickerFixture } from "./fixture";

function StickerInspectorPreviewHarness() {
  const [session] = useState(
    () =>
      new CanvasEditorSession({
        document: createStickerFixtureDocument({ [stickerFixture.id]: stickerFixture }),
      }),
  );
  const state = useSyncExternalStore(session.subscribe, session.getSnapshot);
  const object = state.document.objects[stickerFixture.id];

  if (object?.kind !== "sticker") {
    throw new Error("Sticker preview fixture is missing.");
  }

  return (
    <>
      {renderCanvasModuleInspector({
        object,
        runCommand: (command) => session.runCommand(command),
      })}
      <svg aria-label="Sticker preview">
        <SceneObjectSvg
          document={state.document}
          object={object}
          onSelect={() => undefined}
          selected
        />
      </svg>
    </>
  );
}

describe("Sticker inspector preview", () => {
  it("updates the sticker shape and selected overlay after editing the inspector label", () => {
    const { container } = render(<StickerInspectorPreviewHarness />);
    const labelInput = screen.getByLabelText("Sticker label") as HTMLInputElement;

    fireEvent.change(labelInput, {
      target: { value: "Reviewed" },
    });

    expect(labelInput.value).toBe("Reviewed");
    expect(
      container.querySelector('[data-canvas-object-id="sticker-alpha"] text')?.textContent,
    ).toBe("Reviewed");
    expect(
      container.querySelector('[data-canvas-overlay-id="stickers.selected-label-overlay"]')
        ?.textContent,
    ).toBe("Sticker: Reviewed");
  });
});
