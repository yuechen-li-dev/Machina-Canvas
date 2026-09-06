import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const stickerModuleRoot = join(process.cwd(), "src", "modules", "stickers");

describe("Sticker module locality", () => {
  it("keeps each capability implementation in the sticker module", () => {
    for (const file of [
      "model.ts",
      "command.ts",
      "tool.ts",
      "inspector.tsx",
      "export.ts",
      "ui/renderer.tsx",
      "ui/overlay.tsx",
    ]) {
      const source = readFileSync(join(stickerModuleRoot, file), "utf8");

      expect(source.length).toBeGreaterThan(0);
      expect(source).not.toMatch(/from ["']\.\.\/\.\.\/(?:App|canvasExport|sceneCommands)["']/);
      expect(source).not.toContain("CanvasEditorApp");
    }
  });
});
