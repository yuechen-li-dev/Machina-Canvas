import { type LoadedImageAsset, loadImageAssetFromFile } from "../../imageAssets";
import type {
  CanvasExportCheckoutEntry,
  CanvasExportCheckoutResult,
  CanvasExportManifest,
} from "../../exportCart";

export type CanvasTextFile = {
  readonly name: string;
  readonly text: string;
};

export interface BrowserFileService {
  readText(file: File): Promise<CanvasTextFile>;
  readImage(file: File, options?: { readonly idPrefix?: string }): Promise<LoadedImageAsset>;
}

export interface BrowserExportService {
  copyText(text: string): Promise<void>;
  download(filename: string, payload: Blob | string, mimeType?: string): void;
  checkout(
    mode: "downloadBundle" | "downloadFiles" | "copyText",
    entries: readonly CanvasExportCheckoutEntry[],
    manifest?: CanvasExportManifest,
  ): Promise<CanvasExportCheckoutResult>;
}

export const browserFileService: BrowserFileService = {
  async readText(file) {
    return { name: file.name, text: await file.text() };
  },

  readImage(file, options) {
    return loadImageAssetFromFile(file, options);
  },
};

function getClipboard(): Clipboard | undefined {
  return typeof navigator === "undefined" ? undefined : navigator.clipboard;
}

export const browserExportService: BrowserExportService = {
  async copyText(text) {
    const clipboard = getClipboard();
    if (!clipboard?.writeText) {
      throw new Error("Clipboard API is unavailable in this browser.");
    }
    await clipboard.writeText(text);
  },

  download(filename, payload, mimeType) {
    if (typeof document === "undefined") {
      throw new Error("Download API is unavailable outside a browser.");
    }
    const blob =
      payload instanceof Blob ? payload : new Blob([payload], { type: mimeType ?? "text/plain" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename.replace(/\//g, "__");
    document.body.append(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  },

  async checkout(mode, entries, manifest) {
    try {
      if (mode === "copyText") {
        const text = entries
          .filter((entry) => typeof entry.payload === "string")
          .map((entry) => `# ${entry.filename}\n\n${entry.payload}`)
          .join("\n\n");
        await this.copyText(text);
      } else {
        for (const entry of entries) {
          this.download(entry.filename, entry.payload, entry.mimeType);
        }
      }
      return {
        kind: "ok",
        artifactCount: entries.length,
        filenames: entries.map((entry) => entry.filename),
        manifest,
      };
    } catch (error) {
      return {
        kind: "err",
        message: error instanceof Error ? error.message : "Checkout failed.",
      };
    }
  },
};
