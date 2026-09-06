import type { CanvasModule } from "../core/modules/types";
import {
  createBlankCanvasScene,
  createGraphicsDemoScene,
  createMechanicalDraftingScene,
  createSpriteSheetScene,
  createWebUiDemoScene,
} from "../sceneTemplates";
import { generateAlphaMapTool } from "../tools/generateAlphaMap";
import { stickerExportContribution } from "./stickers/export";
import { createStickerTool } from "./stickers/tool";

export const graphicsModule: CanvasModule = {
  id: "graphics",
  commands: ["select", "move", "resize", "setFill", "setStroke", "align", "distribute"],
  modes: [
    {
      id: "blank",
      title: "Blank canvas",
      subtitle: "General-purpose artboard",
      description: "Start from an empty artboard with the general canvas tools.",
      tags: ["empty", "general", "grid"],
      createScene: createBlankCanvasScene,
      visibleToolGroups: ["geometry", "image", "export", "viewAids"],
    },
    {
      id: "graphics",
      title: "Graphics editing",
      subtitle: "Poster and scene composition",
      description: "Compose text, shapes, images, overlays, and exportable graphics.",
      tags: ["vector", "poster", "images"],
      createScene: createGraphicsDemoScene,
      defaultSelectedObjectId: "headline",
      visibleToolGroups: ["geometry", "image", "export", "viewAids"],
    },
  ],
  renderers: ["rect", "ellipse", "path", "text"],
};

export const imageModule: CanvasModule = {
  id: "images",
  commands: ["addImageObject", "attachAlphaMap", "detachAlphaMap", "attachSketchOverlay"],
  tools: [generateAlphaMapTool],
  inspectors: ["image-assets", "alpha-map", "sketch-overlay"],
  renderers: ["image", "sketchOverlay"],
};

export const spriteModule: CanvasModule = {
  id: "sprites",
  commands: ["addSpriteSidecarObject", "selectSpriteFrame", "updateSpriteFrameRect"],
  inspectors: ["sprite-frame", "sprite-audit", "sprite-overlay"],
  modes: [
    {
      id: "sprites",
      title: "Sprite sheet editing",
      subtitle: "Atlas inspection and sidecars",
      description:
        "Load a sprite sheet and TOML sidecar, inspect cut rectangles, labels, animations, and export sidecars.",
      tags: ["sprites", "sidecars", "toml"],
      createScene: createSpriteSheetScene,
      visibleToolGroups: ["image", "sprite", "export", "viewAids"],
    },
  ],
  diagnostics: ["sprite-audit", "alpha-cut-audit"],
  renderers: ["spriteSidecar"],
};

export const guideModule: CanvasModule = {
  id: "guides",
  commands: [
    "addGuideSidecarObject",
    "addBlockoutSidecarObject",
    "alignObjectByGuideMarks",
    "setGuideSidecarShowLabels",
  ],
  inspectors: ["guide", "blockout", "datum-snap"],
  renderers: ["guideSidecar", "blockoutSidecar"],
};

export const mechanicalModule: CanvasModule = {
  id: "mechanical",
  inspectors: ["mechanical-annotations"],
  modes: [
    {
      id: "mechanical",
      title: "Mechanical drafting",
      subtitle: "Existing geometry + semantic sheet annotations",
      description:
        "Create semantic 2D technical drawings by reusing canvas geometry and layering dimensions, tolerances, notes, datums, and title/revision/BOM records on top.",
      tags: ["mechanical", "drafting", "annotations"],
      createScene: createMechanicalDraftingScene,
      defaultSelectedObjectId: "mechanical-annotations",
      visibleToolGroups: ["geometry", "export", "viewAids"],
    },
  ],
  renderers: ["mechanicalAnnotationSidecar"],
};

export const webUiModule: CanvasModule = {
  id: "webUi",
  commands: ["setUiProp"],
  inspectors: ["ui-component-props"],
  modes: [
    {
      id: "webUi",
      title: "Web/UI editing",
      subtitle: "Component records and TSX lowering",
      description:
        "Author UI component records and lower structured canvas objects toward TSX/layout artifacts.",
      tags: ["components", "layout", "tsx"],
      createScene: createWebUiDemoScene,
      defaultSelectedObjectId: "ui-hero-card",
      visibleToolGroups: ["webUi", "geometry", "export", "viewAids"],
    },
  ],
  renderers: ["uiComponent"],
};

export const stickerModule: CanvasModule = {
  id: "stickers",
  commands: ["addSticker", "renameSticker"],
  tools: [createStickerTool],
  inspectors: ["stickers.label"],
  exporters: [stickerExportContribution],
  renderers: ["sticker"],
};
