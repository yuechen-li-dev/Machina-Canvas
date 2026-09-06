import { Fragment } from "react";
import {
  formatMechanicalDimensionText,
  getMechanicalSheetLayout,
  getMechanicalTableRenderMetrics,
  getMechanicalTitleBlockEntries,
} from "../../../mechanicalAnnotations";
import type { MechanicalAnnotationSidecarObject } from "../../../sceneModel";

export function MechanicalAnnotationSidecarSvg({
  sidecar,
  selected,
}: {
  sidecar: MechanicalAnnotationSidecarObject;
  selected: boolean;
}) {
  if (!sidecar.visible) return null;

  const lineStroke = 0.35;
  const lightStroke = 0.25;
  const labelFontSize = 4.2;
  const noteFontSize = 4.4;
  const blockTitleFontSize = 4;
  const tableHeaderFontSize = 3.1;
  const tableCellFontSize = 3.6;
  const sheetLayout = getMechanicalSheetLayout(sidecar.annotations.sheet);

  const renderLinearDimension = (
    dimension: Extract<
      MechanicalAnnotationSidecarObject["annotations"]["dimensions"][number],
      { kind: "linear" | "aligned" }
    >,
  ) => {
    const dx = dimension.to[0] - dimension.from[0];
    const dy = dimension.to[1] - dimension.from[1];
    const length = Math.hypot(dx, dy) || 1;
    const normalX =
      dimension.kind === "linear" ? (dimension.axis === "horizontal" ? 0 : 1) : -dy / length;
    const normalY =
      dimension.kind === "linear" ? (dimension.axis === "horizontal" ? -1 : 0) : dx / length;
    const offset = dimension.offset ?? 18;
    const start = [
      dimension.from[0] + normalX * offset,
      dimension.from[1] + normalY * offset,
    ] as const;
    const end = [dimension.to[0] + normalX * offset, dimension.to[1] + normalY * offset] as const;
    return (
      <Fragment key={dimension.id}>
        <line
          className="canvas-mechanical-extension"
          stroke="#253043"
          strokeWidth={lightStroke}
          x1={dimension.from[0]}
          x2={start[0]}
          y1={dimension.from[1]}
          y2={start[1]}
        />
        <line
          className="canvas-mechanical-extension"
          stroke="#253043"
          strokeWidth={lightStroke}
          x1={dimension.to[0]}
          x2={end[0]}
          y1={dimension.to[1]}
          y2={end[1]}
        />
        <line
          className="canvas-mechanical-dimension"
          stroke="#253043"
          strokeWidth={lineStroke}
          x1={start[0]}
          x2={end[0]}
          y1={start[1]}
          y2={end[1]}
        />
        <text
          className="canvas-mechanical-label"
          fill="#253043"
          fontSize={labelFontSize}
          stroke="none"
          textAnchor="middle"
          x={(start[0] + end[0]) / 2}
          y={(start[1] + end[1]) / 2 - 4}
        >
          {formatMechanicalDimensionText(dimension, sidecar.annotations.units)}
        </text>
      </Fragment>
    );
  };

  const renderAngleDimension = (
    dimension: Extract<
      MechanicalAnnotationSidecarObject["annotations"]["dimensions"][number],
      { kind: "angle" }
    >,
  ) => {
    const radius = 22;
    const startAngle = Math.atan2(
      dimension.from[1] - dimension.center[1],
      dimension.from[0] - dimension.center[0],
    );
    const endAngle = Math.atan2(
      dimension.to[1] - dimension.center[1],
      dimension.to[0] - dimension.center[0],
    );
    const start = [
      dimension.center[0] + Math.cos(startAngle) * radius,
      dimension.center[1] + Math.sin(startAngle) * radius,
    ] as const;
    const end = [
      dimension.center[0] + Math.cos(endAngle) * radius,
      dimension.center[1] + Math.sin(endAngle) * radius,
    ] as const;
    const largeArc = Math.abs(endAngle - startAngle) > Math.PI ? 1 : 0;
    const midAngle = startAngle + (endAngle - startAngle) / 2;
    const label = [
      dimension.center[0] + Math.cos(midAngle) * (radius + 14),
      dimension.center[1] + Math.sin(midAngle) * (radius + 14),
    ] as const;
    return (
      <Fragment key={dimension.id}>
        <line
          className="canvas-mechanical-extension"
          stroke="#253043"
          strokeWidth={lightStroke}
          x1={dimension.center[0]}
          x2={dimension.from[0]}
          y1={dimension.center[1]}
          y2={dimension.from[1]}
        />
        <line
          className="canvas-mechanical-extension"
          stroke="#253043"
          strokeWidth={lightStroke}
          x1={dimension.center[0]}
          x2={dimension.to[0]}
          y1={dimension.center[1]}
          y2={dimension.to[1]}
        />
        <path
          className="canvas-mechanical-dimension"
          d={`M ${start[0]} ${start[1]} A ${radius} ${radius} 0 ${largeArc} 1 ${end[0]} ${end[1]}`}
          fill="none"
          stroke="#253043"
          strokeWidth={lineStroke}
        />
        <text
          className="canvas-mechanical-label"
          fill="#253043"
          fontSize={labelFontSize}
          stroke="none"
          textAnchor="middle"
          x={label[0]}
          y={label[1]}
        >
          {formatMechanicalDimensionText(dimension, sidecar.annotations.units)}
        </text>
      </Fragment>
    );
  };

  const renderCircularDimension = (
    dimension: Extract<
      MechanicalAnnotationSidecarObject["annotations"]["dimensions"][number],
      { kind: "radius" | "diameter" }
    >,
  ) => {
    const radius = dimension.kind === "radius" ? dimension.radius : dimension.diameter / 2;
    const anchor = [dimension.center[0] + radius, dimension.center[1]] as const;
    return (
      <Fragment key={dimension.id}>
        <line
          className="canvas-mechanical-dimension"
          stroke="#253043"
          strokeWidth={lineStroke}
          x1={dimension.center[0]}
          x2={anchor[0]}
          y1={dimension.center[1]}
          y2={anchor[1]}
        />
        <circle
          className="canvas-mechanical-center-mark"
          cx={dimension.center[0]}
          cy={dimension.center[1]}
          fill="#253043"
          r={1.4}
          stroke="none"
        />
        <text
          className="canvas-mechanical-label"
          fill="#253043"
          fontSize={labelFontSize}
          stroke="none"
          x={anchor[0] + 18}
          y={anchor[1] - 8}
        >
          {formatMechanicalDimensionText(dimension, sidecar.annotations.units)}
        </text>
      </Fragment>
    );
  };

  const renderBlock = (
    block: MechanicalAnnotationSidecarObject["annotations"]["blocks"][number],
  ) => {
    if (block.kind === "titleBlock") {
      const entries = getMechanicalTitleBlockEntries(sidecar.annotations, block);
      const rowHeight = Math.max(5.2, (block.height - 7) / Math.max(entries.length, 1));
      return (
        <g className="canvas-mechanical-block" data-canvas-mechanical-id={block.id} key={block.id}>
          <rect
            fill="#ffffff"
            height={block.height}
            stroke="#253043"
            strokeWidth={lineStroke}
            width={block.width}
            x={block.x}
            y={block.y}
          />
          <text
            className="canvas-mechanical-block-title"
            fill="#253043"
            fontSize={blockTitleFontSize}
            fontWeight={700}
            stroke="none"
            x={block.x + 3}
            y={block.y + 5.5}
          >
            TITLE BLOCK
          </text>
          {entries.map(([key, value], index) => {
            const rowY = block.y + 7 + index * rowHeight;
            return (
              <Fragment key={`${block.id}:${key}`}>
                {index > 0 ? (
                  <line
                    stroke="#253043"
                    strokeWidth={lightStroke}
                    x1={block.x}
                    x2={block.x + block.width}
                    y1={rowY}
                    y2={rowY}
                  />
                ) : null}
                <text
                  className="canvas-mechanical-table-header"
                  fill="#253043"
                  fontSize={tableHeaderFontSize}
                  fontWeight={700}
                  stroke="none"
                  x={block.x + 3}
                  y={rowY + 4.2}
                >
                  {key}
                </text>
                <text
                  className="canvas-mechanical-table-cell"
                  fill="#253043"
                  fontSize={tableCellFontSize}
                  stroke="none"
                  x={block.x + Math.max(24, block.width * 0.34)}
                  y={rowY + 4.4}
                >
                  {value}
                </text>
              </Fragment>
            );
          })}
        </g>
      );
    }

    const { width, height, columnWidth, rowHeight } = getMechanicalTableRenderMetrics(
      sidecar.annotations,
      block,
    );
    const title = block.kind === "revisionTable" ? "REVISIONS" : "BOM";
    return (
      <g className="canvas-mechanical-block" data-canvas-mechanical-id={block.id} key={block.id}>
        <text
          className="canvas-mechanical-block-title"
          fill="#253043"
          fontSize={blockTitleFontSize}
          fontWeight={700}
          stroke="none"
          x={block.x}
          y={block.y - 2}
        >
          {title}
        </text>
        <rect
          className="canvas-mechanical-table"
          fill="#ffffff"
          height={height}
          stroke="#253043"
          strokeWidth={lineStroke}
          width={width}
          x={block.x}
          y={block.y}
        />
        {block.columns.map((column, columnIndex) => (
          <text
            className="canvas-mechanical-table-header"
            fill="#253043"
            fontSize={tableHeaderFontSize}
            fontWeight={700}
            key={`${block.id}:header:${column}`}
            stroke="none"
            x={block.x + columnIndex * columnWidth + 2.5}
            y={block.y + 5.7}
          >
            {column}
          </text>
        ))}
        {Array.from({ length: block.columns.length - 1 }, (_, index) => {
          const x = block.x + (index + 1) * columnWidth;
          return (
            <line
              className="canvas-mechanical-table-line"
              key={`${block.id}:col:${x}`}
              stroke="#253043"
              strokeWidth={lightStroke}
              x1={x}
              x2={x}
              y1={block.y}
              y2={block.y + height}
            />
          );
        })}
        {Array.from({ length: block.rows.length }, (_, index) => {
          const y = block.y + (index + 1) * rowHeight;
          return (
            <line
              className="canvas-mechanical-table-line"
              key={`${block.id}:row:${y}`}
              stroke="#253043"
              strokeWidth={lightStroke}
              x1={block.x}
              x2={block.x + width}
              y1={y}
              y2={y}
            />
          );
        })}
        {block.rows.map((row, rowIndex) =>
          block.columns.map((column, columnIndex) => (
            <text
              className="canvas-mechanical-table-cell"
              fill="#253043"
              fontSize={tableCellFontSize}
              key={`${block.id}:${column}:${JSON.stringify(row)}`}
              stroke="none"
              x={block.x + columnIndex * columnWidth + 2.5}
              y={block.y + (rowIndex + 2) * rowHeight - 2.6}
            >
              {String(row[column] ?? "")}
            </text>
          )),
        )}
      </g>
    );
  };

  return (
    <g
      className={`canvas-mechanical-overlay ${selected ? "is-selected" : ""}`}
      data-canvas-object-id={sidecar.id}
      data-canvas-kind={sidecar.kind}
      data-canvas-name={sidecar.name}
      fill="none"
      fontFamily="Arial, Helvetica, sans-serif"
      pointerEvents="none"
      stroke="#253043"
      strokeLinecap="square"
      strokeLinejoin="miter"
    >
      <g className="canvas-mechanical-sheet-frame" data-canvas-mechanical-sheet="A4-landscape">
        <rect
          className="canvas-mechanical-sheet-boundary"
          fill="#ffffff"
          height={sheetLayout.heightMm}
          stroke="#253043"
          strokeWidth={lineStroke}
          width={sheetLayout.widthMm}
          x={0}
          y={0}
        />
        <rect
          className="canvas-mechanical-sheet-margin"
          fill="none"
          height={sheetLayout.contentBoxMm.height}
          stroke="#7f8896"
          strokeDasharray="2 1.4"
          strokeWidth={lightStroke}
          width={sheetLayout.contentBoxMm.width}
          x={sheetLayout.contentBoxMm.x}
          y={sheetLayout.contentBoxMm.y}
        />
        <rect
          className="canvas-mechanical-sheet-content"
          fill="none"
          height={sheetLayout.contentBoxMm.height}
          stroke="#c7ccd4"
          strokeWidth={lightStroke}
          width={sheetLayout.contentBoxMm.width}
          x={sheetLayout.contentBoxMm.x}
          y={sheetLayout.contentBoxMm.y}
        />
      </g>
      {sidecar.annotations.dimensions.map((dimension) =>
        dimension.kind === "linear" || dimension.kind === "aligned"
          ? renderLinearDimension(dimension)
          : dimension.kind === "angle"
            ? renderAngleDimension(dimension)
            : renderCircularDimension(dimension),
      )}
      {sidecar.annotations.notes.map((note) => (
        <Fragment key={note.id}>
          {note.leaderTo ? (
            <line
              className="canvas-mechanical-note-leader"
              stroke="#253043"
              strokeWidth={lineStroke}
              x1={note.at[0]}
              x2={note.leaderTo[0]}
              y1={note.at[1]}
              y2={note.leaderTo[1]}
            />
          ) : null}
          <text
            className="canvas-mechanical-note"
            fill="#253043"
            fontSize={noteFontSize}
            fontWeight={700}
            stroke="none"
            x={note.at[0]}
            y={note.at[1]}
          >
            {note.text}
          </text>
        </Fragment>
      ))}
      {sidecar.annotations.datums.map((datum) => (
        <Fragment key={datum.id}>
          {datum.target ? (
            <line
              className="canvas-mechanical-datum-leader"
              stroke="#253043"
              strokeWidth={lineStroke}
              x1={datum.at[0]}
              x2={datum.target[0]}
              y1={datum.at[1]}
              y2={datum.target[1]}
            />
          ) : null}
          <rect
            className="canvas-mechanical-datum-box"
            fill="#ffffff"
            height={8}
            stroke="#253043"
            strokeWidth={lineStroke}
            width={10}
            x={datum.at[0] - 4.5}
            y={datum.at[1] - 5.5}
          />
          <text
            className="canvas-mechanical-datum-label"
            fill="#253043"
            fontSize={labelFontSize}
            fontWeight={700}
            stroke="none"
            x={datum.at[0] + 0.4}
            y={datum.at[1] + 1.6}
          >
            {datum.label}
          </text>
        </Fragment>
      ))}
      {sidecar.annotations.blocks.map((block) => renderBlock(block))}
      {selected ? (
        <rect
          className="selection-box"
          height={Math.max(sidecar.height, sheetLayout.heightMm) + 10}
          rx={4}
          width={Math.max(sidecar.width, sheetLayout.widthMm) + 10}
          x={sidecar.x - 5}
          y={sidecar.y - 5}
        />
      ) : null}
    </g>
  );
}
