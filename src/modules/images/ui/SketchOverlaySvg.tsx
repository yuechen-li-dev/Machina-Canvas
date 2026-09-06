import type { CanvasDocument, CanvasObject } from "../../../sceneModel";
import { resolveSketchSpec } from "../../../sketchOverlay";

export function SketchOverlaySvg({
  document,
  overlay,
  selected,
}: {
  document: CanvasDocument;
  overlay: Extract<CanvasObject, { kind: "sketchOverlay" }>;
  selected: boolean;
}) {
  const primitives = resolveSketchSpec(document, overlay.spec);

  return (
    <g
      className={`canvas-sketch-overlay ${selected ? "is-selected" : ""}`}
      data-canvas-object-id={overlay.id}
      data-canvas-kind={overlay.kind}
      data-canvas-name={overlay.name}
      pointerEvents="none"
    >
      {primitives.map((primitive) => {
        if (primitive.kind === "box") {
          return (
            <rect
              className="canvas-sketch-box"
              data-canvas-sketch-id={primitive.id}
              fill={primitive.fill ?? "transparent"}
              height={primitive.rect.height}
              key={primitive.id}
              stroke={primitive.stroke ?? "#2364d2"}
              width={primitive.rect.width}
              x={primitive.rect.x}
              y={primitive.rect.y}
            />
          );
        }
        if (primitive.kind === "line") {
          return (
            <line
              className="canvas-sketch-line"
              data-canvas-sketch-id={primitive.id}
              key={primitive.id}
              stroke={primitive.stroke ?? "#2364d2"}
              x1={primitive.from.x}
              x2={primitive.to.x}
              y1={primitive.from.y}
              y2={primitive.to.y}
            />
          );
        }
        if (primitive.kind === "point") {
          return (
            <circle
              className="canvas-sketch-point"
              cx={primitive.point.x}
              cy={primitive.point.y}
              data-canvas-sketch-id={primitive.id}
              fill={primitive.fill ?? "#ffffff"}
              key={primitive.id}
              r={5}
              stroke={primitive.stroke ?? "#2364d2"}
            />
          );
        }
        return (
          <text
            className="canvas-sketch-label"
            data-canvas-sketch-id={primitive.id}
            key={primitive.id}
            x={primitive.point.x}
            y={primitive.point.y}
          >
            {primitive.text}
          </text>
        );
      })}
      {selected ? (
        <rect
          className="selection-box"
          height={overlay.height + 10}
          rx={4}
          width={overlay.width + 10}
          x={overlay.x - 5}
          y={overlay.y - 5}
        />
      ) : null}
    </g>
  );
}
