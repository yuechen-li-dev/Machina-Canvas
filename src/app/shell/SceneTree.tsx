import type { MachinaSlotProps } from "machinalayout/react";
import { CanvasLayerPanel } from "../../LayerPanel";
import { readViewData } from "../editor/editorShared";

export function SceneTree(props: MachinaSlotProps) {
  const {
    activeMode,
    createLayerGroup,
    createMechanicalAnnotationsSidecar,
    document,
    loadBlockoutSidecarFile,
    loadGuideSidecarFile,
    loadImageFile,
    loadSketchOverlayFile,
    loadSpriteSidecarFile,
    returnToModeSelection,
    runCommand,
  } = readViewData(props);

  return (
    <CanvasLayerPanel
      activeModeTitle={activeMode.title}
      document={document}
      onClearSelection={() => runCommand({ kind: "select" })}
      onCreateGroup={createLayerGroup}
      onCreateMechanicalAnnotations={(options) => createMechanicalAnnotationsSidecar(options)}
      onLoadAlphaMask={(file, options) =>
        loadImageFile(file, {
          role: "alphaMap",
          groupId: options?.groupId,
          attachToImageId: options?.attachToImageId,
        })
      }
      onLoadImage={(file, options) =>
        loadImageFile(file, {
          role: options?.role ?? "image",
          groupId: options?.groupId,
        })
      }
      onLoadGuideToml={(file, options) => loadGuideSidecarFile(file, options)}
      onLoadBlockoutToml={(file, options) => loadBlockoutSidecarFile(file, options)}
      onLoadSketchToml={(file, options) => loadSketchOverlayFile(file, options)}
      onLoadSpriteToml={(file, options) => loadSpriteSidecarFile(file, options)}
      onReturnToModeSelection={returnToModeSelection}
      onSelectObject={(id) => runCommand({ kind: "select", id })}
      onToggleObjectVisibility={(id, visible) => {
        const object = document.objects[id];
        if (!object) return;
        if (object.kind === "guideSidecar") {
          runCommand({ kind: "setGuideSidecarVisible", guideId: id, visible });
          return;
        }
        if (object.kind === "blockoutSidecar") {
          runCommand({
            kind: "setBlockoutSidecarVisible",
            blockoutId: id,
            visible,
          });
          return;
        }
        if (object.kind === "spriteSidecar") {
          runCommand({
            kind: "setSpriteSidecarVisible",
            sidecarId: id,
            visible,
          });
          return;
        }
        if (object.kind === "sketchOverlay") {
          runCommand({
            kind: "setSketchOverlayVisible",
            overlayId: id,
            visible,
          });
        }
      }}
    />
  );
}
