import { makeUniqueObjectId } from "../../imageAssets";
import {
  createDefaultMechanicalSheetMetadata,
  createMechanicalAnnotationSet,
  createMechanicalAnnotationSidecarObject,
} from "../../mechanicalAnnotations";
import { addObjectToLayerGroup } from "../../sceneCommands";
import type { CanvasDocument } from "../../sceneModel";

export function addMechanicalAnnotationSidecar(
  document: CanvasDocument,
  options: {
    readonly layerId: string;
    readonly targetObjectId?: string;
    readonly groupId?: string;
    readonly useDefaultSheet: boolean;
  },
): { readonly document: CanvasDocument; readonly message: string } {
  const target = options.targetObjectId ? document.objects[options.targetObjectId] : undefined;
  const id = makeUniqueObjectId("mechanical-annotations", document);
  const bounds = target ?? { x: 0, y: 0, width: document.width, height: document.height };
  const units = ["mm", "cm", "in", "px"].includes(document.unit) ? document.unit : "px";
  const sidecar = createMechanicalAnnotationSidecarObject({
    id,
    name: "Mechanical annotations",
    layerId: target?.layerId ?? options.layerId,
    x: bounds.x,
    y: bounds.y,
    width: bounds.width,
    height: bounds.height,
    targetObjectId: target?.id,
    annotations: createMechanicalAnnotationSet({
      id: `${id}-set`,
      units: units as "mm" | "cm" | "in" | "px",
      sheet: options.useDefaultSheet ? createDefaultMechanicalSheetMetadata() : undefined,
    }),
  });
  let nextDocument: CanvasDocument = {
    ...document,
    selectedObjectId: sidecar.id,
    objects: { ...document.objects, [sidecar.id]: sidecar },
    layers: document.layers.map((layer) =>
      layer.id === sidecar.layerId
        ? { ...layer, objectIds: [...layer.objectIds, sidecar.id] }
        : layer,
    ),
  };
  if (options.groupId) {
    nextDocument = addObjectToLayerGroup(nextDocument, options.groupId, sidecar.id);
  }
  return { document: nextDocument, message: `created ${sidecar.name.toLowerCase()}` };
}
