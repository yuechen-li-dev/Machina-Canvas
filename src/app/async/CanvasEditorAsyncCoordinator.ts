import { type CanvasExportBundle, createCanvasExportBundle } from "../../canvasExport";
import {
  type CanvasExportValidationResult,
  formatCanvasExportValidationReport,
  validateCanvasExportBundle,
} from "../../canvasExportValidation";
import type { CanvasViewport } from "../../canvasViewport";
import type { CanvasEditorSession } from "../../core/editor/CanvasEditorSession";
import type { CanvasEditorModeId } from "../../editorModes";
import {
  type CanvasExportArtifact,
  type CanvasExportCart,
  type CanvasExportCheckoutResult,
  createCanvasCheckpointArtifact,
  materializeExportCart,
} from "../../exportCart";
import {
  getRasterExportFileName,
  lowerCanvasDocumentToRasterBlob,
  normalizeRasterExportOptions,
  type RasterExportBackground,
} from "../../rasterExport";
import type {
  CanvasCommand,
  CanvasCommandApplyContext,
  CanvasCommandApplyResult,
  CanvasCommandValidationResult,
} from "../../sceneCommands";
import type { GeometryDiagnostic } from "../../sceneGeometry";
import type { CanvasDocument, CanvasImageRole } from "../../sceneModel";
import { summarizeScene } from "../../sceneSummary";
import { addBlockoutSidecar, addGuideSidecar } from "../../modules/guides/loadActions";
import { addImageAsset, addSketchOverlay } from "../../modules/images/loadActions";
import { addMechanicalAnnotationSidecar } from "../../modules/mechanical/loadActions";
import { addSpriteSidecar } from "../../modules/sprites/loadActions";
import type { BrowserExportService, BrowserFileService } from "../browser/BrowserEditorServices";

export type EditorAsyncResult<T> =
  | { readonly kind: "ok"; readonly value: T; readonly message: string }
  | { readonly kind: "err"; readonly error: string };

export type CoordinatorDocumentResult = {
  readonly document: CanvasDocument;
  readonly commands?: readonly CanvasCommand[];
  readonly commandResults?: readonly CanvasCommandApplyResult[];
  readonly validation?: CanvasCommandValidationResult;
};

export type CoordinatorExportResult = {
  readonly bundle: CanvasExportBundle;
  readonly validation: CanvasExportValidationResult;
  readonly selectedPath: string;
};

export type CoordinatorRasterResult = CoordinatorExportResult & {
  readonly raster: { readonly path: string; readonly mimeType: string; readonly blob: Blob };
};

type CheckoutSuccess = Extract<CanvasExportCheckoutResult, { readonly kind: "ok" }>;

type CoordinatorOptions = {
  readonly session: CanvasEditorSession;
  readonly files: BrowserFileService;
  readonly exports: BrowserExportService;
};

type LoadContext = {
  readonly document: CanvasDocument;
  readonly layerId: string;
  readonly targetId?: string;
  readonly groupId?: string;
  readonly commandOptions?: CanvasCommandApplyContext;
};

export class CanvasEditorAsyncCoordinator {
  readonly #session: CanvasEditorSession;
  readonly #files: BrowserFileService;
  readonly #exports: BrowserExportService;

  constructor(options: CoordinatorOptions) {
    this.#session = options.session;
    this.#files = options.files;
    this.#exports = options.exports;
  }

  async loadImage(
    file: File,
    context: LoadContext & { readonly role: CanvasImageRole; readonly attachToImageId?: string },
  ): Promise<EditorAsyncResult<CoordinatorDocumentResult>> {
    return this.#attempt(async () => {
      const asset = await this.#files.readImage(file, {
        idPrefix: context.role === "image" ? "image-" : "alpha-",
      });
      return this.#accept(
        addImageAsset(context.document, asset, {
          role: context.role,
          layerId: context.layerId,
          groupId: context.groupId,
          attachToImageId: context.attachToImageId,
          commandOptions: context.commandOptions,
        }),
      );
    }, "Image file could not be loaded.");
  }

  async loadSpriteSidecar(
    file: File,
    context: LoadContext,
  ): Promise<EditorAsyncResult<CoordinatorDocumentResult>> {
    return this.#loadText(file, "Sprite sidecar could not be loaded.", (textFile) =>
      addSpriteSidecar(context.document, textFile, context),
    );
  }

  async loadGuideSidecar(
    file: File,
    context: LoadContext,
  ): Promise<EditorAsyncResult<CoordinatorDocumentResult>> {
    return this.#loadText(file, "Guide sidecar could not be loaded.", (textFile) =>
      addGuideSidecar(context.document, textFile, context),
    );
  }

  async loadBlockoutSidecar(
    file: File,
    context: LoadContext,
  ): Promise<EditorAsyncResult<CoordinatorDocumentResult>> {
    return this.#loadText(file, "Blockout sidecar could not be loaded.", (textFile) =>
      addBlockoutSidecar(context.document, textFile, context),
    );
  }

  async loadSketchOverlay(
    file: File,
    context: LoadContext,
  ): Promise<EditorAsyncResult<CoordinatorDocumentResult>> {
    return this.#loadText(file, "Sketch overlay could not be loaded.", (textFile) =>
      addSketchOverlay(context.document, textFile, context),
    );
  }

  async createMechanicalSidecar(
    context: LoadContext & { readonly useDefaultSheet: boolean },
  ): Promise<EditorAsyncResult<CoordinatorDocumentResult>> {
    return this.#attempt(async () => {
      const result = addMechanicalAnnotationSidecar(context.document, {
        layerId: context.layerId,
        targetObjectId: context.targetId,
        groupId: context.groupId,
        useDefaultSheet: context.useDefaultSheet,
      });
      return this.#accept(result);
    }, "Mechanical annotations could not be created.");
  }

  generateExport(input: {
    readonly document: CanvasDocument;
    readonly viewport: CanvasViewport;
    readonly commands?: readonly CanvasCommand[];
    readonly diagnostics: readonly GeometryDiagnostic[];
    readonly tsx: boolean;
  }): EditorAsyncResult<CoordinatorExportResult> {
    try {
      const bundle = createCanvasExportBundle(input.document, {
        selectedObjectId: input.document.selectedObjectId,
        commands: input.commands,
        summary: summarizeScene(input.document),
        diagnostics: input.diagnostics,
        viewport: input.viewport,
        tsxOptions: input.tsx ? { componentName: "GeneratedPage" } : undefined,
      });
      const validation = validateCanvasExportBundle(bundle, {
        expectedCommands: input.commands !== undefined,
      });
      return {
        kind: "ok",
        value: {
          bundle,
          validation,
          selectedPath: input.tsx ? "generated-page.tsx" : "handoff.toml",
        },
        message: input.tsx ? "TSX page generated" : "export generated",
      };
    } catch (error) {
      return { kind: "err", error: this.#error(error, "Export generation failed.") };
    }
  }

  async generateRaster(input: {
    readonly document: CanvasDocument;
    readonly viewport: CanvasViewport;
    readonly commands?: readonly CanvasCommand[];
    readonly diagnostics: readonly GeometryDiagnostic[];
    readonly scale: number;
    readonly background: RasterExportBackground;
  }): Promise<EditorAsyncResult<CoordinatorRasterResult>> {
    return this.#attempt(async () => {
      const options = normalizeRasterExportOptions({
        mimeType: "image/png",
        scale: input.scale,
        background: input.background,
      });
      const path = getRasterExportFileName("render", options);
      const blob = await lowerCanvasDocumentToRasterBlob(input.document, options);
      const bundle = createCanvasExportBundle(input.document, {
        selectedObjectId: input.document.selectedObjectId,
        commands: input.commands,
        summary: summarizeScene(input.document),
        diagnostics: input.diagnostics,
        viewport: input.viewport,
        rasterArtifactPath: path,
        rasterOptions: options,
      });
      return {
        bundle,
        validation: validateCanvasExportBundle(bundle, {
          expectedCommands: input.commands !== undefined,
        }),
        selectedPath: "handoff.toml",
        raster: { path, mimeType: options.mimeType, blob },
        message: `Generated ${path}.`,
      };
    }, "PNG export failed.");
  }

  async checkout(input: {
    readonly artifacts: readonly CanvasExportArtifact[];
    readonly cart: CanvasExportCart;
    readonly activeModeId?: CanvasEditorModeId;
  }): Promise<EditorAsyncResult<CheckoutSuccess>> {
    const materialized = await materializeExportCart(input);
    if (materialized.kind === "err") {
      return { kind: "err", error: materialized.message };
    }
    const result = await this.#exports.checkout(
      input.cart.checkoutMode,
      materialized.entries,
      materialized.manifest,
    );
    return result.kind === "ok"
      ? { kind: "ok", value: result, message: "export checkout completed" }
      : { kind: "err", error: result.message };
  }

  async checkpoint(input: {
    readonly document: CanvasDocument;
    readonly activeModeId?: CanvasEditorModeId;
    readonly selectedSpriteFrameId?: string;
    readonly message?: string;
  }): Promise<EditorAsyncResult<CheckoutSuccess>> {
    const artifact = createCanvasCheckpointArtifact({
      scene: input.document,
      activeModeId: input.activeModeId,
      selectedObjectId: input.document.selectedObjectId,
      selectedSpriteFrameId: input.selectedSpriteFrameId,
      message: input.message,
    });
    const result = await this.checkout({
      artifacts: [artifact],
      cart: { selectedArtifactIds: [artifact.id], checkoutMode: "downloadFiles" },
      activeModeId: input.activeModeId,
    });
    return result.kind === "ok"
      ? { ...result, message: `Checkpoint saved as ${artifact.filename}.` }
      : result;
  }

  copyText(text: string): Promise<void> {
    return this.#exports.copyText(text);
  }

  copyValidation(validation: CanvasExportValidationResult): Promise<void> {
    return this.#exports.copyText(formatCanvasExportValidationReport(validation));
  }

  download(filename: string, payload: Blob | string, mimeType?: string): void {
    this.#exports.download(filename, payload, mimeType);
  }

  async #loadText(
    file: File,
    fallback: string,
    load: (file: { readonly name: string; readonly text: string }) => {
      readonly document: CanvasDocument;
      readonly message: string;
      readonly commands?: readonly CanvasCommand[];
      readonly commandResults?: readonly CanvasCommandApplyResult[];
      readonly validation?: CanvasCommandValidationResult;
    },
  ): Promise<EditorAsyncResult<CoordinatorDocumentResult>> {
    return this.#attempt(
      async () => this.#accept(load(await this.#files.readText(file))),
      fallback,
    );
  }

  #accept(result: CoordinatorDocumentResult & { readonly message: string }) {
    this.#session.replaceDocument(result.document, result.message);
    return result;
  }

  async #attempt<T>(action: () => Promise<T>, fallback: string): Promise<EditorAsyncResult<T>> {
    try {
      const value = await action();
      const message =
        typeof value === "object" && value !== null && "message" in value
          ? String(value.message)
          : "operation completed";
      return { kind: "ok", value, message };
    } catch (error) {
      return { kind: "err", error: this.#error(error, fallback) };
    }
  }

  #error(error: unknown, fallback: string): string {
    return error instanceof Error ? error.message : fallback;
  }
}
