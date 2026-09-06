import { matchKind } from "machinalayout/match";
import type { MouseEvent } from "react";
import { getCanvasImageMaskId, getImagePreserveAspectRatio } from "../../canvasImageSvg";
import type { CanvasDocument, CanvasObject, ImageObject, TextObject } from "../../sceneModel";
import { getCanvasUiComponentDefinition } from "../../uiComponents/catalog";
import {
  type CanvasObjectRenderContext,
  renderCanvasModuleObject,
  renderCanvasModuleOverlays,
} from "./objectContributions";

export function wrapText(object: TextObject): string[] {
  const maxChars = Math.max(8, Math.floor(object.width / (object.fontSize * 0.48)));
  const words = object.text.split(" ");
  const lines: string[] = [];
  let line = "";

  for (const word of words) {
    const next = line ? `${line} ${word}` : word;
    if (next.length > maxChars && line) {
      lines.push(line);
      line = word;
    } else {
      line = next;
    }
  }

  if (line) lines.push(line);
  return lines;
}

export function SceneObjectSvg({
  document,
  object,
  alphaMap,
  selected,
  onSelect,
}: {
  document: CanvasDocument;
  object: CanvasObject;
  alphaMap?: ImageObject;
  selected: boolean;
  onSelect: (id: string) => void;
}) {
  if (!object.visible) return null;
  const common = {
    "data-canvas-object-id": object.id,
    "data-canvas-kind": object.kind,
    "data-canvas-name": object.name,
    onClick: (event: MouseEvent) => {
      event.stopPropagation();
      onSelect(object.id);
    },
  };

  const contributionContext: CanvasObjectRenderContext = {
    document,
    object,
    selected,
    onSelect,
    commonSvgProps: common,
  };
  const contributedShape = renderCanvasModuleObject(contributionContext);
  const shape =
    contributedShape ??
    matchKind(object, {
      rect: (rect) => (
        <rect
          {...common}
          x={rect.x}
          y={rect.y}
          width={rect.width}
          height={rect.height}
          rx={rect.radius ?? 0}
          fill={rect.fill ?? "transparent"}
          stroke={rect.stroke ?? "none"}
        />
      ),
      ellipse: (ellipse) => (
        <ellipse
          {...common}
          cx={ellipse.x + ellipse.width / 2}
          cy={ellipse.y + ellipse.height / 2}
          rx={ellipse.width / 2}
          ry={ellipse.height / 2}
          fill={ellipse.fill ?? "transparent"}
          stroke={ellipse.stroke ?? "none"}
        />
      ),
      path: (path) => (
        <path
          {...common}
          d={path.d}
          fill={path.fill ?? "transparent"}
          fillRule={path.fillRule}
          stroke={path.stroke ?? "none"}
          strokeWidth={path.strokeWidth ?? 1}
          strokeDasharray={path.strokeDasharray}
        />
      ),
      text: (text) => (
        <text
          {...common}
          x={text.x}
          y={text.y + text.fontSize}
          fill={text.fill ?? "#111111"}
          fontSize={text.fontSize}
          fontWeight={text.fontWeight}
        >
          {wrapText(text).map((line, index) => (
            <tspan key={line} x={text.x} dy={index === 0 ? 0 : text.fontSize * 1.12}>
              {line}
            </tspan>
          ))}
        </text>
      ),
      uiComponent: (component) => (
        <foreignObject
          {...common}
          x={component.x}
          y={component.y}
          width={component.width}
          height={component.height}
        >
          <div className="canvas-ui-preview-shell">
            {(() => {
              try {
                const PreviewComponent = getCanvasUiComponentDefinition(
                  component.componentId,
                ).preview;
                return <PreviewComponent object={component} selected={selected} />;
              } catch {
                return (
                  <div className="canvas-ui-preview-missing">
                    Unknown component {component.componentId}
                  </div>
                );
              }
            })()}
          </div>
        </foreignObject>
      ),
      image: (image) => (
        <image
          {...common}
          href={image.src}
          x={image.x}
          y={image.y}
          width={image.width}
          height={image.height}
          preserveAspectRatio={getImagePreserveAspectRatio(image.fit)}
          opacity={image.opacity}
          mask={alphaMap ? `url(#${getCanvasImageMaskId(image.id)})` : undefined}
        />
      ),
      sticker: () => null,
      sketchOverlay: () => null,
      spriteSidecar: () => null,
      guideSidecar: () => null,
      blockoutSidecar: () => null,
      mechanicalAnnotationSidecar: () => null,
    });

  return (
    <g className={`canvas-object ${selected ? "is-selected" : ""}`}>
      {shape}
      {renderCanvasModuleOverlays(contributionContext)}
      {selected ? (
        <rect
          className="selection-box"
          x={object.x - 5}
          y={object.y - 5}
          width={object.width + 10}
          height={object.height + 10}
          rx={4}
        />
      ) : null}
    </g>
  );
}
