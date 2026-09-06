import { describe, expect, it } from "vitest";
import {
  type CanvasExportContribution,
  collectCanvasModuleExportArtifacts,
} from "../../src/export/contributions";
import { createStickerFixtureDocument } from "../modules/stickers/fixture";

function contribution(id: string, path: string): CanvasExportContribution {
  return {
    id,
    collect: () => [{ path, mimeType: "text/plain", text: id }],
  };
}

describe("Canvas export contributions", () => {
  it("rejects duplicate paths between module contributions", () => {
    expect(() =>
      collectCanvasModuleExportArtifacts(createStickerFixtureDocument(), [
        contribution("first", "reports/shared.txt"),
        contribution("second", "reports/shared.txt"),
      ]),
    ).toThrow('Canvas export contribution "second" produced duplicate path "reports/shared.txt".');
  });

  it("rejects paths reserved by the core bundle", () => {
    expect(() =>
      collectCanvasModuleExportArtifacts(
        createStickerFixtureDocument(),
        [contribution("module", "document.json")],
        new Set(["document.json"]),
      ),
    ).toThrow('Canvas export contribution "module" produced duplicate path "document.json".');
  });
});
