import { describe, expect, it } from "vitest";
import { defineCanvasModules } from "../../src/modules";

describe("Canvas module composition", () => {
  it("rejects duplicate module ids after normalization", () => {
    expect(() => defineCanvasModules([{ id: "stickers" }, { id: " stickers " }])).toThrow(
      'Duplicate canvas module id "stickers".',
    );
  });
});
