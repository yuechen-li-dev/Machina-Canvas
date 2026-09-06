import { formatCanvasMeasurement, getCanvasUnitSystem } from "../../canvasUnits";
import { createReferenceGridConfig, getColumnLabel } from "../../referenceGrid";
import type { CanvasDocument } from "../../sceneModel";
import { getSelectedObject } from "../editor/editorShared";

export function ReferenceGridOverlay({
  document,
  showLines,
}: {
  document: CanvasDocument;
  showLines: boolean;
}) {
  const config = createReferenceGridConfig(document.referenceGrid);
  const cellWidth = document.width / config.columns;
  const cellHeight = document.height / config.rows;
  const columnLabels = Array.from({ length: config.columns }, (_, index) =>
    getColumnLabel(index, config.columnStart),
  );
  const rowLabels = Array.from({ length: config.rows }, (_, index) =>
    String((config.rowStart ?? 1) + index),
  );

  return (
    <g className="reference-grid-overlay">
      {config.showBorder ? (
        <rect
          className="reference-grid-border"
          x={0}
          y={0}
          width={document.width}
          height={document.height}
        />
      ) : null}
      {showLines
        ? Array.from({ length: config.columns - 1 }, (_, index) => (
            <line
              className="reference-grid-line"
              key={`col-${(index + 1) * cellWidth}`}
              x1={(index + 1) * cellWidth}
              y1={0}
              x2={(index + 1) * cellWidth}
              y2={document.height}
            />
          ))
        : null}
      {showLines
        ? Array.from({ length: config.rows - 1 }, (_, index) => (
            <line
              className="reference-grid-line"
              key={`row-${(index + 1) * cellHeight}`}
              x1={0}
              y1={(index + 1) * cellHeight}
              x2={document.width}
              y2={(index + 1) * cellHeight}
            />
          ))
        : null}
      {config.showLabels
        ? columnLabels.map((label, index) => (
            <text
              className="reference-grid-label"
              key={label}
              x={index * cellWidth + cellWidth / 2}
              y={18}
              textAnchor="middle"
            >
              {label}
            </text>
          ))
        : null}
      {config.showLabels
        ? rowLabels.map((label, index) => (
            <text
              className="reference-grid-label"
              key={label}
              x={14}
              y={index * cellHeight + cellHeight / 2}
              dominantBaseline="middle"
              textAnchor="middle"
            >
              {label}
            </text>
          ))
        : null}
    </g>
  );
}

export function MeasurementLabelsOverlay({ document }: { document: CanvasDocument }) {
  const selected = getSelectedObject(document);
  if (!selected) return null;

  const unitSystem = getCanvasUnitSystem(document);
  const width = formatCanvasMeasurement(selected.width, unitSystem);
  const height = formatCanvasMeasurement(selected.height, unitSystem);
  const centerX = formatCanvasMeasurement(selected.x + selected.width / 2, unitSystem);
  const centerY = formatCanvasMeasurement(selected.y + selected.height / 2, unitSystem);
  const labelY = Math.max(18, selected.y - 12);

  return (
    <g className="measurement-label-overlay" pointerEvents="none">
      <text x={selected.x} y={labelY}>
        w {width} x h {height}
      </text>
      <text x={selected.x} y={selected.y + selected.height + 18}>
        center {centerX}, {centerY}
      </text>
    </g>
  );
}
