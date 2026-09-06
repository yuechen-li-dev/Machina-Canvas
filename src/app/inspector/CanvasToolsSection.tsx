import type { MachinaSlotProps } from "machinalayout/react";
import { useState } from "react";
import { canvasTools, GENERATE_ALPHA_MAP_TOOL_ID, listCanvasTools } from "../../tools";
import { getSelectedObject, readViewData } from "../editor/editorShared";
import { InspectorSection, ToggleField } from "./shared";

export function CanvasToolsSection(props: MachinaSlotProps) {
  const { document, lastToolResult, runCanvasTool } = readViewData(props);
  const selected = getSelectedObject(document);
  const [autoAttach, setAutoAttach] = useState(true);

  if (selected?.kind !== "image") return null;

  const availableTools = listCanvasTools(canvasTools).filter(
    (tool) =>
      tool.targetKind === "image-object" &&
      (selected.role === undefined || selected.role === "image"),
  );
  if (availableTools.length === 0) return null;

  return (
    <InspectorSection title="Tools">
      <ToggleField label="Auto-attach alpha map" checked={autoAttach} onChange={setAutoAttach} />
      <div className="tool-actions">
        {availableTools.map((tool) => (
          <button
            key={tool.id}
            type="button"
            onClick={() =>
              runCanvasTool(tool.id, {
                targetObjectId: selected.id,
                options:
                  tool.id === GENERATE_ALPHA_MAP_TOOL_ID
                    ? {
                        autoAttach,
                      }
                    : undefined,
              })
            }
          >
            {tool.label}
          </button>
        ))}
      </div>
      {lastToolResult ? (
        <div className="last-tool-result">
          <strong>{lastToolResult.toolId}</strong>
          {lastToolResult.createdObjectIds?.length ? (
            <p>Created: {lastToolResult.createdObjectIds.join(", ")}</p>
          ) : null}
          {lastToolResult.updatedObjectIds?.length ? (
            <p>Updated: {lastToolResult.updatedObjectIds.join(", ")}</p>
          ) : null}
          {lastToolResult.notes?.map((note) => (
            <p key={`${lastToolResult.toolId}-${note}`}>{note}</p>
          ))}
        </div>
      ) : null}
    </InspectorSection>
  );
}
