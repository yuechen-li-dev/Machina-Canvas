// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  browserExportService,
  browserFileService,
} from "../../src/app/browser/BrowserEditorServices";

afterEach(() => vi.unstubAllGlobals());

describe("browser editor services", () => {
  it("normalizes a browser text file into a plain value", async () => {
    const result = await browserFileService.readText(new File(["hello"], "guide.toml"));
    expect(result).toEqual({ name: "guide.toml", text: "hello" });
  });

  it("normalizes image input through the image loader", async () => {
    vi.stubGlobal("Image", undefined);
    const svg = '<svg xmlns="http://www.w3.org/2000/svg" width="12" height="8" />';
    const result = await browserFileService.readImage(
      new File([svg], "sample.svg", { type: "image/svg+xml" }),
    );
    expect(result).toMatchObject({
      id: "image-sample",
      name: "Sample",
      fileName: "sample.svg",
      mimeType: "image/svg+xml",
    });
  });

  it("uses the clipboard adapter and reports unavailable clipboard", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal("navigator", { clipboard: { writeText } });
    await browserExportService.copyText("copy me");
    expect(writeText).toHaveBeenCalledWith("copy me");
  });

  it("owns object URL creation and download anchor cleanup", () => {
    const createObjectURL = vi.fn(() => "blob:test");
    const revokeObjectURL = vi.fn();
    vi.stubGlobal("URL", { createObjectURL, revokeObjectURL });
    const click = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
    browserExportService.download("folder/file.txt", "text", "text/plain");
    expect(click).toHaveBeenCalledOnce();
    expect(revokeObjectURL).toHaveBeenCalledWith("blob:test");
  });
});
