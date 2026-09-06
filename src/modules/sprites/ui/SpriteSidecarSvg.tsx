import { Fragment, type PointerEvent as ReactPointerEvent } from "react";
import type { CanvasSpriteFrame, ImageObject, SpriteSidecarObject } from "../../../sceneModel";
import { mapSpriteFrameToCanvasRect, type SpriteFrameRect } from "../../../spriteFrameEditor";
import type { SpriteFrameGuideRegionContext } from "../../../spriteGuideRegions";
import {
  buildSpriteOverlayLabelChip,
  createSpriteOverlayRenderPlan,
  getSpriteOverlayFrameClassNames,
  getSpriteOverlaySubgridClassNames,
  layoutSpriteOverlayLabelChip,
} from "../../../spriteOverlay";

export function SpriteSidecarSvg({
  image,
  sidecar,
  selected,
  selectedGuideRegionContext,
  draftRect,
  hoveredFrameId,
  onFramePointerDown,
  onFramePointerEnter,
  onFramePointerLeave,
  onResizeHandlePointerDown,
}: {
  image: ImageObject;
  sidecar: SpriteSidecarObject;
  selected: boolean;
  selectedGuideRegionContext?: SpriteFrameGuideRegionContext;
  draftRect?: SpriteFrameRect;
  hoveredFrameId?: string;
  onFramePointerDown: (event: ReactPointerEvent<SVGRectElement>, frame: CanvasSpriteFrame) => void;
  onFramePointerEnter: (frameId: string) => void;
  onFramePointerLeave: (frameId: string) => void;
  onResizeHandlePointerDown: (
    event: ReactPointerEvent<SVGRectElement>,
    frame: CanvasSpriteFrame,
  ) => void;
}) {
  if (!sidecar.visible) return null;

  const selectedFrameId = sidecar.spec.selectedFrameId;
  const plan = createSpriteOverlayRenderPlan(sidecar, { hoveredFrameId });
  const imageRect = {
    x: image.x,
    y: image.y,
    width: image.width,
    height: image.height,
  };

  return (
    <g
      className={`canvas-sprite-overlay ${selected ? "is-selected" : ""}`}
      data-canvas-object-id={sidecar.id}
      data-canvas-kind={sidecar.kind}
      data-canvas-name={sidecar.name}
    >
      {sidecar.spec.grids.map((grid) => {
        const presentation = plan.subgridPresentations.get(grid.id);
        if (!presentation?.showRect) return null;
        const rect = mapSpriteFrameToCanvasRect(image, grid);
        const fill =
          presentation.emphasis === "context"
            ? "rgba(23, 91, 201, 0.06)"
            : "rgba(23, 91, 201, 0.02)";
        const stroke = presentation.emphasis === "context" ? "#175bc9" : "#7f9bc6";
        return (
          <Fragment key={`subgrid:${grid.id}`}>
            <rect
              className={getSpriteOverlaySubgridClassNames(presentation)}
              data-canvas-sprite-subgrid-id={grid.id}
              fill={fill}
              height={rect.height}
              stroke={stroke}
              strokeDasharray={presentation.emphasis === "context" ? "10 6" : "6 8"}
              width={rect.width}
              x={rect.x}
              y={rect.y}
            />
            {presentation.showLabel ? (
              <text
                className={`canvas-sprite-subgrid-label${presentation.emphasis === "context" ? " sprite-subgrid--context" : presentation.emphasis === "dimmed" ? " sprite-subgrid--dimmed" : ""}`}
                data-canvas-sprite-subgrid-id={grid.id}
                x={rect.x + 6}
                y={rect.y + 16}
              >
                {grid.id}
              </text>
            ) : null}
          </Fragment>
        );
      })}
      {sidecar.spec.frames.map((frame) => {
        const presentation = plan.framePresentations.get(frame.id);
        if (!presentation) return null;
        const frameGuideRegionContext =
          frame.id === sidecar.spec.selectedFrameId ? selectedGuideRegionContext : undefined;
        const rect =
          draftRect && frame.id === selectedFrameId
            ? mapSpriteFrameToCanvasRect(image, draftRect)
            : mapSpriteFrameToCanvasRect(image, frame);
        const chip = presentation.showLabel
          ? buildSpriteOverlayLabelChip(frame, presentation.sourceKind, presentation.emphasis)
          : undefined;
        const chipLayout =
          chip !== undefined ? layoutSpriteOverlayLabelChip(rect, imageRect, chip) : undefined;
        const fill =
          presentation.emphasis === "selected"
            ? "rgba(255, 196, 0, 0.18)"
            : presentation.emphasis === "hovered"
              ? "rgba(255, 196, 0, 0.1)"
              : presentation.sourceKind === "grid"
                ? presentation.emphasis === "dimmed"
                  ? "rgba(0, 160, 140, 0.03)"
                  : "rgba(0, 160, 140, 0.08)"
                : presentation.emphasis === "dimmed"
                  ? "rgba(201, 95, 23, 0.03)"
                  : "rgba(201, 95, 23, 0.08)";
        const stroke =
          presentation.emphasis === "selected"
            ? "#ffb000"
            : presentation.emphasis === "hovered"
              ? "#ffcf5d"
              : presentation.emphasis === "audit"
                ? "#d64242"
                : presentation.emphasis === "dimmed"
                  ? presentation.sourceKind === "grid"
                    ? "#8abaae"
                    : "#d9a27f"
                  : presentation.sourceKind === "grid"
                    ? "#00a08c"
                    : presentation.sourceKind === "manual"
                      ? "#8f3fd1"
                      : "#c95f17";
        return (
          <Fragment key={frame.id}>
            <rect
              className="canvas-sprite-frame-hit"
              data-canvas-sprite-frame-id={frame.id}
              fill="transparent"
              height={rect.height}
              onPointerDown={(event) => onFramePointerDown(event, frame)}
              onPointerEnter={() => onFramePointerEnter(frame.id)}
              onPointerLeave={() => onFramePointerLeave(frame.id)}
              stroke="transparent"
              strokeWidth={12}
              width={rect.width}
              x={rect.x}
              y={rect.y}
            />
            {presentation.showRect ? (
              <rect
                className={`${getSpriteOverlayFrameClassNames(presentation)}${
                  frameGuideRegionContext &&
                  frame.id === sidecar.spec.selectedFrameId &&
                  frameGuideRegionContext.relation !== "contains"
                    ? " sprite-frame--outside-guide"
                    : ""
                }`}
                data-canvas-sprite-frame-id={frame.id}
                data-canvas-sprite-source-kind={presentation.sourceKind}
                fill={fill}
                height={rect.height}
                stroke={stroke}
                width={rect.width}
                x={rect.x}
                y={rect.y}
              />
            ) : null}
            {presentation.showLabel && chip && chipLayout ? (
              <Fragment>
                <rect
                  className={`canvas-sprite-label-chip${presentation.labelTone === "selected" ? " sprite-frame-label--selected" : presentation.labelTone === "hovered" ? " sprite-frame-label--hovered" : presentation.labelTone === "audit" ? " sprite-frame-label--audit" : ""}`}
                  data-canvas-sprite-frame-id={frame.id}
                  fill={
                    presentation.labelTone === "selected"
                      ? "#111111"
                      : presentation.labelTone === "hovered"
                        ? "#1f463f"
                        : presentation.labelTone === "audit"
                          ? "#5a1f1f"
                          : "#1b1b1b"
                  }
                  height={chipLayout.height}
                  rx={6}
                  ry={6}
                  width={chipLayout.width}
                  x={chipLayout.x}
                  y={chipLayout.y}
                />
                <text
                  className={`canvas-sprite-label${presentation.labelTone === "selected" ? " sprite-frame-label--selected" : presentation.labelTone === "hovered" ? " sprite-frame-label--hovered" : presentation.labelTone === "audit" ? " sprite-frame-label--audit" : ""}`}
                  data-canvas-sprite-frame-id={frame.id}
                  x={chipLayout.x + 8}
                  y={chipLayout.titleY}
                >
                  {chip.title}
                </text>
                {chip.detail && chipLayout.detailY !== undefined ? (
                  <text
                    className="canvas-sprite-label-meta"
                    data-canvas-sprite-frame-id={frame.id}
                    x={chipLayout.x + 8}
                    y={chipLayout.detailY}
                  >
                    {chip.detail}
                  </text>
                ) : null}
              </Fragment>
            ) : null}
            {presentation.showHandle ? (
              <rect
                className="canvas-sprite-resize-handle"
                fill="#ffb000"
                height={10}
                onPointerDown={(event) => onResizeHandlePointerDown(event, frame)}
                width={10}
                x={rect.x + rect.width - 5}
                y={rect.y + rect.height - 5}
              />
            ) : null}
          </Fragment>
        );
      })}
      {selected ? (
        <rect
          className="selection-box"
          height={sidecar.height + 10}
          rx={4}
          width={sidecar.width + 10}
          x={sidecar.x - 5}
          y={sidecar.y - 5}
        />
      ) : null}
    </g>
  );
}
