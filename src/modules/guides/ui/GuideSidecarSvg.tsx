import { Fragment } from "react";
import { validateGuideSidecar } from "../../../guideSidecar";
import type { GuideSidecarObject, ImageObject } from "../../../sceneModel";
import type { SpriteFrameDatumSnapTarget } from "../../../spriteGuideDatums";
import type { SpriteFrameGuideRegionContext } from "../../../spriteGuideRegions";

export function GuideSidecarSvg({
  image,
  guideObject,
  selected,
  selectedDatumTargets,
  selectedGuideRegionContext,
}: {
  image: ImageObject;
  guideObject: GuideSidecarObject;
  selected: boolean;
  selectedDatumTargets: readonly SpriteFrameDatumSnapTarget[];
  selectedGuideRegionContext?: SpriteFrameGuideRegionContext;
}) {
  if (!guideObject.visible) return null;

  const scaleX = image.width / (image.intrinsicWidth ?? image.width);
  const scaleY = image.height / (image.intrinsicHeight ?? image.height);
  const mapPoint = (x: number, y: number) => ({
    x: image.x + x * scaleX,
    y: image.y + y * scaleY,
  });
  const diagnostics = validateGuideSidecar(guideObject.guide, {
    imageWidth: image.intrinsicWidth ?? image.width,
    imageHeight: image.intrinsicHeight ?? image.height,
  });
  const selectedDatumIds = new Set(selectedDatumTargets.map((target) => target.datumId));
  const nearestDatumId = selectedDatumTargets[0]?.datumId;
  const opacity = guideObject.opacity ?? 0.9;
  const showLabels = guideObject.showLabels ?? true;

  return (
    <g
      className={`canvas-guide-overlay ${selected ? "is-selected" : ""}`}
      data-canvas-object-id={guideObject.id}
      data-canvas-kind={guideObject.kind}
      data-canvas-name={guideObject.name}
      opacity={opacity}
      pointerEvents="none"
    >
      {guideObject.guide.regions.map((region) => {
        const origin = mapPoint(region.x, region.y);
        const width = region.width * scaleX;
        const height = region.height * scaleY;
        const grid = region.grid;
        const isSelectedContextRegion =
          selectedGuideRegionContext?.guideSidecarId === guideObject.id &&
          selectedGuideRegionContext.regionId === region.id;
        const isWarningRegion =
          isSelectedContextRegion && selectedGuideRegionContext.relation !== "contains";
        return (
          <Fragment key={`guide-region:${region.id}`}>
            <rect
              className={`canvas-guide-region${
                isSelectedContextRegion ? " guide-region--selected-context" : ""
              }${isWarningRegion ? " guide-region--warning" : ""}`}
              data-canvas-guide-region-id={region.id}
              x={origin.x}
              y={origin.y}
              width={width}
              height={height}
              fill={isSelectedContextRegion ? "rgba(255, 122, 0, 0.1)" : "rgba(233, 77, 26, 0.06)"}
              stroke={isWarningRegion ? "#d64242" : isSelectedContextRegion ? "#ff7a00" : "#e94d1a"}
              strokeDasharray={isWarningRegion ? "10 4" : isSelectedContextRegion ? "10 5" : "8 6"}
            />
            {showLabels ? (
              <text className="canvas-guide-label" x={origin.x + 6} y={origin.y + 16}>
                {region.id}
              </text>
            ) : null}
            {grid
              ? Array.from({ length: grid.columns - 1 }, (_, index) => {
                  const lineX = origin.x + (index + 1) * grid.cellWidth * scaleX;
                  return (
                    <line
                      className="canvas-guide-grid"
                      key={`guide-grid-col:${region.id}:${lineX}`}
                      x1={lineX}
                      y1={origin.y}
                      x2={lineX}
                      y2={origin.y + height}
                      stroke="#f58d61"
                    />
                  );
                })
              : null}
            {grid
              ? Array.from({ length: grid.rows - 1 }, (_, index) => {
                  const lineY = origin.y + (index + 1) * grid.cellHeight * scaleY;
                  return (
                    <line
                      className="canvas-guide-grid"
                      key={`guide-grid-row:${region.id}:${lineY}`}
                      x1={origin.x}
                      y1={lineY}
                      x2={origin.x + width}
                      y2={lineY}
                      stroke="#f58d61"
                    />
                  );
                })
              : null}
          </Fragment>
        );
      })}
      {guideObject.guide.datums.map((datum) => {
        const datumClassName = `canvas-guide-datum${
          selectedDatumIds.has(datum.id) ? " guide-datum--snap-target" : ""
        }${nearestDatumId === datum.id ? " guide-datum--nearest" : ""}`;
        if (datum.kind === "vertical") {
          const x = image.x + datum.x * scaleX;
          return (
            <g key={`guide-datum:${datum.id}`}>
              <line
                className={datumClassName}
                x1={x}
                y1={image.y}
                x2={x}
                y2={image.y + image.height}
                stroke="#d9480f"
              />
              {showLabels ? (
                <text className="canvas-guide-label" x={x + 4} y={image.y + 14}>
                  {datum.label ?? datum.id}
                </text>
              ) : null}
            </g>
          );
        }
        if (datum.kind === "horizontal") {
          const y = image.y + datum.y * scaleY;
          return (
            <g key={`guide-datum:${datum.id}`}>
              <line
                className={datumClassName}
                x1={image.x}
                y1={y}
                x2={image.x + image.width}
                y2={y}
                stroke="#d9480f"
              />
              {showLabels ? (
                <text className="canvas-guide-label" x={image.x + 6} y={y - 4}>
                  {datum.label ?? datum.id}
                </text>
              ) : null}
            </g>
          );
        }
        const point = mapPoint(datum.x, datum.y);
        return (
          <g key={`guide-datum:${datum.id}`}>
            <line
              className={datumClassName}
              x1={point.x - 6}
              y1={point.y}
              x2={point.x + 6}
              y2={point.y}
              stroke="#d9480f"
            />
            <line
              className={datumClassName}
              x1={point.x}
              y1={point.y - 6}
              x2={point.x}
              y2={point.y + 6}
              stroke="#d9480f"
            />
            {showLabels ? (
              <text className="canvas-guide-label" x={point.x + 8} y={point.y - 8}>
                {datum.label ?? datum.id}
              </text>
            ) : null}
          </g>
        );
      })}
      {guideObject.guide.dimensions.map((dimension) => {
        if (dimension.kind !== "linear" || !dimension.from || !dimension.to) return null;
        const from = mapPoint(dimension.from[0], dimension.from[1]);
        const to = mapPoint(dimension.to[0], dimension.to[1]);
        const labelX = (from.x + to.x) / 2;
        const labelY = (from.y + to.y) / 2 - 6;
        return (
          <g key={`guide-dimension:${dimension.id}`}>
            <line
              className="canvas-guide-dimension"
              x1={from.x}
              y1={from.y}
              x2={to.x}
              y2={to.y}
              stroke="#ff7a00"
            />
            {showLabels ? (
              <text className="canvas-guide-label" x={labelX} y={labelY} textAnchor="middle">
                {dimension.label}
              </text>
            ) : null}
          </g>
        );
      })}
      {guideObject.guide.alignmentMarks.map((mark) => {
        const point = mapPoint(mark.x, mark.y);
        return (
          <g key={`guide-mark:${mark.id}`}>
            <circle className="canvas-guide-mark" cx={point.x} cy={point.y} r={4} fill="#c92a2a" />
            <line x1={point.x - 8} y1={point.y} x2={point.x + 8} y2={point.y} stroke="#c92a2a" />
            <line x1={point.x} y1={point.y - 8} x2={point.x} y2={point.y + 8} stroke="#c92a2a" />
            {showLabels ? (
              <text className="canvas-guide-label" x={point.x + 8} y={point.y + 14}>
                {mark.label ?? mark.id}
              </text>
            ) : null}
          </g>
        );
      })}
      {showLabels && diagnostics.length > 0 ? (
        <text className="canvas-guide-label" x={image.x + 8} y={image.y + image.height - 8}>
          {`${diagnostics.length} guide finding${diagnostics.length === 1 ? "" : "s"}`}
        </text>
      ) : null}
      {selected ? (
        <rect
          className="selection-box"
          height={guideObject.height + 10}
          rx={4}
          width={guideObject.width + 10}
          x={guideObject.x - 5}
          y={guideObject.y - 5}
        />
      ) : null}
    </g>
  );
}
