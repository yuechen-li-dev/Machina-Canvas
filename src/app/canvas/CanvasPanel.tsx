import type { MachinaSlotProps } from "machinalayout/react";
import {
  Fragment,
  type PointerEvent as ReactPointerEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { getCanvasImageMaskId, getImagePreserveAspectRatio } from "../../canvasImageSvg";
import {
  getCanvasViewportViewBox,
  nextZoomStep,
  setCanvasViewportZoom,
} from "../../canvasViewport";
import {
  formatCoordinateProfileSummary,
  getCoordinateProfile,
  visualDirectionDelta,
} from "../../coordinateProfiles";
import { BlockoutSidecarSvg } from "../../modules/guides/ui/BlockoutSidecarSvg";
import { GuideSidecarSvg } from "../../modules/guides/ui/GuideSidecarSvg";
import { SketchOverlaySvg } from "../../modules/images/ui/SketchOverlaySvg";
import { MechanicalAnnotationSidecarSvg } from "../../modules/mechanical/ui/MechanicalAnnotationSidecarSvg";
import { SpriteSidecarSvg } from "../../modules/sprites/ui/SpriteSidecarSvg";
import type {
  CanvasObject,
  CanvasSpriteFrame,
  ImageObject,
  SpriteSidecarObject,
} from "../../sceneModel";
import { hitTestSpriteFrameAtPoint, snapSpriteFrameRect } from "../../spriteFrameEditor";
import {
  clampSpriteFrameRectToGuideRegion,
  findGuideRegionForSpriteFrame,
} from "../../spriteGuideRegions";
import {
  type CanvasPanState,
  formatDocumentSize,
  getBlockoutSidecarsForObject,
  getGuideSidecarsForImage,
  getMechanicalAnnotationSidecarsForObject,
  getSelectedObject,
  getSketchOverlayForImage,
  getSpriteSidecarForImage,
  readViewData,
  type SpriteDragState,
} from "../editor/editorShared";
import {
  getSelectedSpriteFrameDatumTargets,
  getSelectedSpriteFrameGuideRegionContext,
  getSelectedSpriteFrameState,
} from "../inspector/Inspector";
import { MeasurementLabelsOverlay, ReferenceGridOverlay } from "./AidOverlays";
import {
  beginCanvasPan,
  clientPointToCanvas,
  didSpriteFrameChange,
  moveSpriteDrag,
  resolveCanvasPan,
} from "./interactions";
import { SceneObjectSvg } from "./SceneObjectRenderer";

export function CanvasPanel(props: MachinaSlotProps) {
  const {
    activeMode,
    document,
    viewport,
    setViewport,
    aidToggles,
    runCommand,
    runCommands,
    spriteFrameEditSettings,
  } = readViewData(props);
  const viewBox = getCanvasViewportViewBox(document, viewport);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [dragState, setDragState] = useState<SpriteDragState>();
  const [panState, setPanState] = useState<CanvasPanState>();
  const [hoveredFrame, setHoveredFrame] = useState<
    { sidecarId: string; frameId: string } | undefined
  >();
  const selected = getSelectedObject(document);
  const coordinateProfile = getCoordinateProfile(document.coordinateProfileId);
  const selectedSpriteFrame = getSelectedSpriteFrameState(document, selected);
  const selectedGuideRegionContext = getSelectedSpriteFrameGuideRegionContext(document, selected);
  const selectedDatumTargets = getSelectedSpriteFrameDatumTargets(document, selected, {
    maxDistance: spriteFrameEditSettings.datumSnapDistance,
    restrictToRegion: spriteFrameEditSettings.restrictDatumSnapsToGuideRegion,
  });
  const alphaMappedImages = document.layers
    .filter((layer) => layer.visible)
    .flatMap((layer) => layer.objectIds.map((id) => document.objects[id]))
    .filter(
      (object): object is ImageObject =>
        object?.kind === "image" &&
        object.alphaMapId !== undefined &&
        document.objects[object.alphaMapId]?.kind === "image",
    );

  const getSvgPoint = useCallback(
    (clientX: number, clientY: number) => {
      const svg = svgRef.current;
      if (!svg) return undefined;
      const bounds = svg.getBoundingClientRect();
      return clientPointToCanvas(bounds, viewBox, clientX, clientY);
    },
    [viewBox],
  );

  const getDraftRect = useCallback(
    (state: SpriteDragState) => {
      const image = document.objects[state.imageId];
      if (image?.kind !== "image") return state.startRect;
      const sourceWidth = image.intrinsicWidth ?? image.width;
      const sourceHeight = image.intrinsicHeight ?? image.height;
      const scaleX = image.width / sourceWidth;
      const scaleY = image.height / sourceHeight;
      const dx = (state.currentPoint.x - state.startPoint.x) / scaleX;
      const dy = (state.currentPoint.y - state.startPoint.y) / scaleY;
      const unsnapped =
        state.mode === "move"
          ? {
              x: state.startRect.x + dx,
              y: state.startRect.y + dy,
              width: state.startRect.width,
              height: state.startRect.height,
            }
          : {
              x: state.startRect.x,
              y: state.startRect.y,
              width: state.startRect.width + dx,
              height: state.startRect.height + dy,
            };
      return snapSpriteFrameRect(
        spriteFrameEditSettings.constrainFrameEditsToGuideRegion
          ? (() => {
              const guideContext = findGuideRegionForSpriteFrame(document, {
                spriteSidecarId: state.sidecarId,
                frameId: state.frameId,
              });
              return guideContext
                ? clampSpriteFrameRectToGuideRegion(
                    {
                      x: Math.max(0, unsnapped.x),
                      y: Math.max(0, unsnapped.y),
                      width: Math.max(1, unsnapped.width),
                      height: Math.max(1, unsnapped.height),
                    },
                    guideContext.region,
                  )
                : {
                    x: Math.max(0, unsnapped.x),
                    y: Math.max(0, unsnapped.y),
                    width: Math.max(1, unsnapped.width),
                    height: Math.max(1, unsnapped.height),
                  };
            })()
          : {
              x: Math.max(0, unsnapped.x),
              y: Math.max(0, unsnapped.y),
              width: Math.max(1, unsnapped.width),
              height: Math.max(1, unsnapped.height),
            },
        {
          enabled: spriteFrameEditSettings.snapToGrid,
          gridSize: spriteFrameEditSettings.gridSize,
        },
      );
    },
    [
      document,
      spriteFrameEditSettings.constrainFrameEditsToGuideRegion,
      spriteFrameEditSettings.gridSize,
      spriteFrameEditSettings.snapToGrid,
    ],
  );

  useEffect(() => {
    setHoveredFrame((current) => {
      if (!current) return undefined;
      const sidecar = document.objects[current.sidecarId];
      if (sidecar?.kind !== "spriteSidecar") return undefined;
      return sidecar.spec.frames.some((frame) => frame.id === current.frameId)
        ? current
        : undefined;
    });
  }, [document.objects]);

  useEffect(() => {
    if (!panState) return;

    const handlePointerMove = (event: PointerEvent) => {
      const svg = svgRef.current;
      if (!svg) return;
      const bounds = svg.getBoundingClientRect();
      const nextViewport = resolveCanvasPan(
        document,
        panState,
        bounds,
        event.clientX,
        event.clientY,
      );
      if (nextViewport) setViewport(nextViewport);
    };

    const handlePointerUp = () => {
      setPanState(undefined);
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
    window.addEventListener("pointercancel", handlePointerUp);
    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
      window.removeEventListener("pointercancel", handlePointerUp);
    };
  }, [document, panState, setViewport]);

  useEffect(() => {
    if (!dragState) return;

    const handlePointerMove = (event: PointerEvent) => {
      const point = getSvgPoint(event.clientX, event.clientY);
      if (!point) return;
      setDragState((current) => (current ? moveSpriteDrag(current, point) : current));
    };

    const handlePointerUp = (event: PointerEvent) => {
      const point = getSvgPoint(event.clientX, event.clientY);
      const current = dragState;
      setDragState(undefined);
      if (!current || !point) return;
      const finalRect = getDraftRect({ ...current, currentPoint: point });
      if (didSpriteFrameChange(current, finalRect)) {
        runCommand({
          kind: "updateSpriteFrameRect",
          sidecarId: current.sidecarId,
          frameId: current.frameId,
          rect: finalRect,
        });
      }
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };
  }, [dragState, getDraftRect, getSvgPoint, runCommand]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const tag = target?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || target?.isContentEditable) {
        return;
      }
      const selected = document.selectedObjectId
        ? document.objects[document.selectedObjectId]
        : undefined;
      if (selected?.kind !== "spriteSidecar" || !selected.spec.selectedFrameId) return;
      const step = event.shiftKey ? 10 : 1;
      if (!["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key)) return;
      event.preventDefault();
      const [dx, dy] =
        event.key === "ArrowLeft"
          ? visualDirectionDelta({
              direction: "left",
              amount: step,
              profile: coordinateProfile,
            })
          : event.key === "ArrowRight"
            ? visualDirectionDelta({
                direction: "right",
                amount: step,
                profile: coordinateProfile,
              })
            : event.key === "ArrowUp"
              ? visualDirectionDelta({
                  direction: "up",
                  amount: step,
                  profile: coordinateProfile,
                })
              : visualDirectionDelta({
                  direction: "down",
                  amount: step,
                  profile: coordinateProfile,
                });
      runCommand({
        kind: "nudgeSpriteFrame",
        sidecarId: selected.id,
        frameId: selected.spec.selectedFrameId,
        dx,
        dy,
      });
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [coordinateProfile, document, runCommand]);

  const beginFrameDrag = useCallback(
    (
      event: ReactPointerEvent<SVGRectElement>,
      image: ImageObject,
      sidecar: SpriteSidecarObject,
      frame: CanvasSpriteFrame,
      mode: "move" | "resize",
    ) => {
      if (event.button !== 0) return;
      event.stopPropagation();
      const point = getSvgPoint(event.clientX, event.clientY);
      if (!point) return;
      const hit = hitTestSpriteFrameAtPoint(sidecar, image, point);
      const resolvedFrame = hit?.frame ?? frame;
      if (
        document.selectedObjectId !== sidecar.id ||
        sidecar.spec.selectedFrameId !== resolvedFrame.id
      ) {
        runCommands([
          { kind: "select", id: sidecar.id },
          {
            kind: "selectSpriteFrame",
            sidecarId: sidecar.id,
            frameId: resolvedFrame.id,
          },
        ]);
      }
      setDragState({
        sidecarId: sidecar.id,
        frameId: resolvedFrame.id,
        imageId: image.id,
        mode,
        startPoint: point,
        currentPoint: point,
        startRect: {
          x: resolvedFrame.x,
          y: resolvedFrame.y,
          width: resolvedFrame.width,
          height: resolvedFrame.height,
        },
      });
    },
    [document.selectedObjectId, getSvgPoint, runCommands],
  );

  return (
    <main className="canvas-panel panel">
      <div className="canvas-heading">
        <div>
          <small>Canvas / Artboard</small>
          <h1>{document.name}</h1>
          <small>{activeMode.subtitle}</small>
        </div>
        <span>
          {formatDocumentSize(document)} · Coordinates:{" "}
          {formatCoordinateProfileSummary(coordinateProfile)}
        </span>
      </div>
      <div className="artboard-wrap">
        <svg
          className={panState ? "artboard is-panning" : "artboard"}
          ref={svgRef}
          onPointerDownCapture={(event) => {
            if (event.button !== 1) return;
            event.preventDefault();
            setPanState(beginCanvasPan(event.clientX, event.clientY, viewport));
          }}
          onPointerLeave={() => setHoveredFrame(undefined)}
          onWheel={(event) => {
            event.preventDefault();
            setViewport((current) =>
              setCanvasViewportZoom(current, nextZoomStep(current.zoom, event.deltaY < 0 ? 1 : -1)),
            );
          }}
          viewBox={`${viewBox.x} ${viewBox.y} ${viewBox.width} ${viewBox.height}`}
          role="img"
          aria-label={`${document.name} scene graph`}
        >
          {alphaMappedImages.length > 0 ? (
            <defs>
              {alphaMappedImages.map((object) => {
                const alphaMap = document.objects[object.alphaMapId as string];
                if (alphaMap?.kind !== "image") return null;
                return (
                  <mask
                    id={getCanvasImageMaskId(object.id)}
                    key={object.id}
                    maskUnits="userSpaceOnUse"
                  >
                    <image
                      href={alphaMap.src}
                      x={object.x}
                      y={object.y}
                      width={object.width}
                      height={object.height}
                      preserveAspectRatio={getImagePreserveAspectRatio(object.fit)}
                    />
                  </mask>
                );
              })}
            </defs>
          ) : null}
          {document.layers
            .filter((layer) => layer.visible)
            .flatMap((layer) => layer.objectIds.map((id) => document.objects[id]))
            .filter((object): object is CanvasObject => object !== undefined)
            .map((object) => {
              const alphaMap =
                object.kind === "image" && object.alphaMapId
                  ? document.objects[object.alphaMapId]
                  : undefined;
              const sketchOverlay =
                object.kind === "image" ? getSketchOverlayForImage(document, object) : undefined;
              const guideSidecars =
                object.kind === "image" ? getGuideSidecarsForImage(document, object) : [];
              const blockoutSidecars = getBlockoutSidecarsForObject(document, object);
              const mechanicalSidecars = getMechanicalAnnotationSidecarsForObject(document, object);
              const standaloneMechanicalSidecar =
                object.kind === "mechanicalAnnotationSidecar" &&
                (!object.targetObjectId || document.objects[object.targetObjectId] === undefined)
                  ? object
                  : undefined;
              const spriteSidecar =
                object.kind === "image" ? getSpriteSidecarForImage(document, object) : undefined;
              return (
                <Fragment key={object.id}>
                  <SceneObjectSvg
                    document={document}
                    object={object}
                    alphaMap={alphaMap?.kind === "image" ? alphaMap : undefined}
                    selected={document.selectedObjectId === object.id}
                    onSelect={(id) => runCommand({ kind: "select", id })}
                  />
                  {sketchOverlay ? (
                    <SketchOverlaySvg
                      document={document}
                      overlay={sketchOverlay}
                      selected={document.selectedObjectId === sketchOverlay.id}
                    />
                  ) : null}
                  {object.kind === "image"
                    ? guideSidecars.map((guideObject) => (
                        <GuideSidecarSvg
                          guideObject={guideObject}
                          image={object}
                          key={guideObject.id}
                          selected={document.selectedObjectId === guideObject.id}
                          selectedDatumTargets={selectedDatumTargets.filter(
                            (target) => target.guideSidecarId === guideObject.id,
                          )}
                          selectedGuideRegionContext={
                            selectedGuideRegionContext?.guideSidecarId === guideObject.id
                              ? selectedGuideRegionContext
                              : undefined
                          }
                        />
                      ))
                    : null}
                  {blockoutSidecars.map((sidecar) => (
                    <BlockoutSidecarSvg
                      key={sidecar.id}
                      owner={object}
                      selected={document.selectedObjectId === sidecar.id}
                      sidecar={sidecar}
                    />
                  ))}
                  {mechanicalSidecars.map((sidecar) => (
                    <MechanicalAnnotationSidecarSvg
                      key={sidecar.id}
                      selected={document.selectedObjectId === sidecar.id}
                      sidecar={sidecar}
                    />
                  ))}
                  {standaloneMechanicalSidecar ? (
                    <MechanicalAnnotationSidecarSvg
                      selected={document.selectedObjectId === standaloneMechanicalSidecar.id}
                      sidecar={standaloneMechanicalSidecar}
                    />
                  ) : null}
                  {object.kind === "image" && spriteSidecar ? (
                    <SpriteSidecarSvg
                      draftRect={
                        dragState &&
                        dragState.sidecarId === spriteSidecar.id &&
                        dragState.frameId === spriteSidecar.spec.selectedFrameId
                          ? getDraftRect(dragState)
                          : undefined
                      }
                      hoveredFrameId={
                        hoveredFrame?.sidecarId === spriteSidecar.id
                          ? hoveredFrame.frameId
                          : undefined
                      }
                      image={object}
                      onFramePointerDown={(event, frame) =>
                        beginFrameDrag(event, object, spriteSidecar, frame, "move")
                      }
                      onFramePointerEnter={(frameId) =>
                        setHoveredFrame((current) =>
                          current?.sidecarId === spriteSidecar.id && current.frameId === frameId
                            ? current
                            : { sidecarId: spriteSidecar.id, frameId },
                        )
                      }
                      onFramePointerLeave={(frameId) =>
                        setHoveredFrame((current) =>
                          current?.sidecarId === spriteSidecar.id && current.frameId === frameId
                            ? undefined
                            : current,
                        )
                      }
                      onResizeHandlePointerDown={(event, frame) =>
                        beginFrameDrag(event, object, spriteSidecar, frame, "resize")
                      }
                      sidecar={spriteSidecar}
                      selected={document.selectedObjectId === spriteSidecar.id}
                      selectedGuideRegionContext={
                        selectedGuideRegionContext &&
                        spriteSidecar.id === selectedSpriteFrame?.sidecar.id
                          ? selectedGuideRegionContext
                          : undefined
                      }
                    />
                  ) : null}
                </Fragment>
              );
            })}
          {aidToggles.showMeasurementLabels ? (
            <MeasurementLabelsOverlay document={document} />
          ) : null}
          {aidToggles.showReferenceGrid ? (
            <ReferenceGridOverlay
              document={document}
              showLines={aidToggles.showReferenceGridLines}
            />
          ) : null}
        </svg>
      </div>
    </main>
  );
}
