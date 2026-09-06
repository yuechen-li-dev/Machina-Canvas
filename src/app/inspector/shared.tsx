import type { ReactNode } from "react";
import type { CanvasEditorModeId } from "../../editorModes";
import type { CanvasObject } from "../../sceneModel";
import type { InspectorGroupId } from "../editor/editorShared";

export function InspectorSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="inspector-section">
      <h3>{title}</h3>
      <div className="inspector-rows">{children}</div>
    </section>
  );
}

export function Field({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="field-row">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

export function formatImageSrcLabel(src: string): string {
  if (src.startsWith("data:")) {
    const mimeType = /^data:([^;,]+)/.exec(src)?.[1] ?? "data URL";
    return `${mimeType} data URL (${src.length.toLocaleString()} chars)`;
  }
  return src;
}

export function createClosedInspectorGroups(): Record<InspectorGroupId, boolean> {
  return {
    "selected-object": false,
    "selected-sprite-frame": false,
    geometry: false,
    viewport: false,
    alignment: false,
    "sprite-sidecar": false,
    "sprite-audit": false,
    "ui-component": false,
    "view-aids": false,
    "image-assets": false,
    export: false,
    "command-diagnostics": false,
    metadata: false,
  };
}

export function getDefaultInspectorAccordionState(options: {
  modeId: CanvasEditorModeId;
  selected?: CanvasObject;
  showViewAids: boolean;
  showImageTools: boolean;
  showExport: boolean;
  hasSelectedSpriteFrame: boolean;
  hasSpriteAuditResults: boolean;
}): Record<InspectorGroupId, boolean> {
  const state = createClosedInspectorGroups();
  state["selected-object"] = true;
  state.geometry = true;
  state.metadata = true;
  state.alignment = Boolean(
    options.selected?.kind === "image" || options.selected?.kind === "guideSidecar",
  );
  state["ui-component"] = options.selected?.kind === "uiComponent";
  if (options.showViewAids) state.viewport = options.modeId !== "sprites";
  if (options.showImageTools) state["image-assets"] = options.modeId !== "sprites";
  if (options.showExport) state.export = options.modeId !== "sprites";
  if (
    options.selected?.kind === "guideSidecar" ||
    options.selected?.kind === "mechanicalAnnotationSidecar"
  ) {
    state["sprite-sidecar"] = true;
  }
  if (options.modeId === "sprites") {
    state.viewport = true;
    state["sprite-sidecar"] = options.selected?.kind === "spriteSidecar";
    state["selected-sprite-frame"] = options.hasSelectedSpriteFrame;
    state["sprite-audit"] = options.hasSpriteAuditResults;
    state["view-aids"] = false;
    state["image-assets"] = false;
    state.export = false;
    state["command-diagnostics"] = false;
  }
  return state;
}

export function ToggleField({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="toggle-row">
      <span>{label}</span>
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.currentTarget.checked)}
      />
    </label>
  );
}

export function NumberField({
  label,
  value,
  min,
  onChange,
}: {
  label: string;
  value: number;
  min?: number;
  onChange: (value: number) => void;
}) {
  return (
    <label className="ui-prop-row">
      <span>{label}</span>
      <input
        min={min}
        onChange={(event) => {
          const next = event.currentTarget.valueAsNumber;
          if (Number.isFinite(next)) onChange(next);
        }}
        type="number"
        value={value}
      />
    </label>
  );
}
