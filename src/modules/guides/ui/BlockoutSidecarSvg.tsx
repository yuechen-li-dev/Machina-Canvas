import { Fragment } from "react";
import { validateBlockoutSidecar } from "../../../blockoutSidecar";
import type { BlockoutSidecarObject, CanvasObject } from "../../../sceneModel";

export function BlockoutSidecarSvg({
  owner,
  sidecar,
  selected,
}: {
  owner: CanvasObject;
  sidecar: BlockoutSidecarObject;
  selected: boolean;
}) {
  if (!sidecar.visible) return null;

  const sourceWidth =
    owner.kind === "image" ? (owner.intrinsicWidth ?? owner.width) : sidecar.width || owner.width;
  const sourceHeight =
    owner.kind === "image"
      ? (owner.intrinsicHeight ?? owner.height)
      : sidecar.height || owner.height;
  const scaleX = owner.width / (sourceWidth || owner.width || 1);
  const scaleY = owner.height / (sourceHeight || owner.height || 1);
  const opacity = sidecar.opacity ?? 0.72;
  const showLabels = sidecar.showLabels ?? true;
  const mapPoint = (x: number, y: number) => ({
    x: owner.x + x * scaleX,
    y: owner.y + y * scaleY,
  });
  const diagnostics = validateBlockoutSidecar(sidecar.blockout);

  return (
    <g
      className={`canvas-blockout-overlay ${selected ? "is-selected" : ""}`}
      data-canvas-object-id={sidecar.id}
      data-canvas-kind={sidecar.kind}
      data-canvas-name={sidecar.name}
      opacity={opacity}
      pointerEvents="none"
    >
      {sidecar.blockout.boxes.map((box) => {
        const origin = mapPoint(box.x, box.y);
        const width = box.width * scaleX;
        const height = box.height * scaleY;
        const stroke =
          box.role === "construction" ? "#ff8c00" : box.role === "void" ? "#169c46" : "#13a538";
        const fill =
          box.role === "void"
            ? "rgba(19, 165, 56, 0.06)"
            : box.role === "construction"
              ? "rgba(255, 140, 0, 0.05)"
              : "rgba(19, 165, 56, 0.14)";
        return (
          <Fragment key={`blockout-box:${box.id}`}>
            <rect
              className={`canvas-blockout-box${
                box.role === "construction"
                  ? " blockout-role--construction"
                  : box.role === "void"
                    ? " blockout-role--void"
                    : ""
              }`}
              x={origin.x}
              y={origin.y}
              width={width}
              height={height}
              fill={fill}
              stroke={stroke}
              strokeDasharray={
                box.role === "construction" ? "7 4" : box.role === "void" ? "10 4" : "8 5"
              }
            />
            {showLabels ? (
              <text className="canvas-blockout-label" x={origin.x + 6} y={origin.y + 16}>
                {box.label ?? box.id}
              </text>
            ) : null}
          </Fragment>
        );
      })}
      {sidecar.blockout.points.map((point) => {
        const mapped = mapPoint(point.x, point.y);
        return (
          <g key={`blockout-point:${point.id}`}>
            <line
              className="canvas-blockout-point"
              x1={mapped.x - 6}
              y1={mapped.y}
              x2={mapped.x + 6}
              y2={mapped.y}
              stroke="#0f8f37"
            />
            <line
              className="canvas-blockout-point"
              x1={mapped.x}
              y1={mapped.y - 6}
              x2={mapped.x}
              y2={mapped.y + 6}
              stroke="#0f8f37"
            />
            {showLabels ? (
              <text className="canvas-blockout-label" x={mapped.x + 8} y={mapped.y - 8}>
                {point.label ?? point.id}
              </text>
            ) : null}
          </g>
        );
      })}
      {sidecar.blockout.curves.map((curve) => {
        if (curve.points.length < 2) return null;
        const mappedPoints = curve.points.map((point) => mapPoint(point[0], point[1]));
        const d = mappedPoints
          .map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`)
          .join(" ");
        const stroke =
          curve.role === "construction" || curve.kind === "centerline" ? "#ff8c00" : "#13a538";
        return (
          <g key={`blockout-curve:${curve.id}`}>
            <path
              className={`canvas-blockout-curve${
                curve.role === "construction" || curve.kind === "centerline"
                  ? " blockout-role--construction"
                  : ""
              }`}
              d={d}
              fill="none"
              stroke={stroke}
              strokeDasharray={
                curve.role === "construction" || curve.kind === "centerline" ? "6 4" : "5 3"
              }
            />
            {showLabels ? (
              <text
                className="canvas-blockout-label"
                x={mappedPoints[0].x + 6}
                y={mappedPoints[0].y - 8}
              >
                {curve.label ?? curve.id}
              </text>
            ) : null}
          </g>
        );
      })}
      {showLabels && diagnostics.length > 0 ? (
        <text className="canvas-blockout-label" x={owner.x + 8} y={owner.y + owner.height - 8}>
          {`${diagnostics.length} blockout finding${diagnostics.length === 1 ? "" : "s"}`}
        </text>
      ) : null}
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
