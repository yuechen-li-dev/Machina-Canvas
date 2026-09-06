import type { CanvasInspectorContribution } from "../../../app/inspectorContributions";
import { getSpriteSidecarForImage, getSpriteSidecarTarget } from "../../../app/editor/editorShared";
import { Field, ToggleField } from "../../../app/inspector/shared";
import { InspectorAccordionGroup } from "../../../InspectorAccordionGroup";
import {
  getSpriteOverlayDisplayModeLabel,
  SPRITE_OVERLAY_DISPLAY_MODES,
} from "../../../spriteOverlay";
import { getSpriteFrameSummary } from "../../../spriteSidecar";
import { SpriteAuditSectionContent } from "./SpriteInspectorSections";

export const spriteInspectorContribution: CanvasInspectorContribution = {
  id: "sprites.sidecar",
  order: 30,
  supports: (object) => object.kind === "image" || object.kind === "spriteSidecar",
  renderPanels({ document, object, panel, runCommand }) {
    if (object.kind !== "image" && object.kind !== "spriteSidecar") return null;
    const panels = [];
    if (object.kind === "spriteSidecar") {
      panels.push(
        <InspectorAccordionGroup
          id="sprite-sidecar"
          key={`${panel.contextKey}:sprite-sidecar`}
          onOpenChange={(open) => panel.setOpen("sprite-sidecar", open)}
          open={panel.isOpen("sprite-sidecar")}
          subtitle={`${object.spec.frames.length} frames`}
          title="Sprite sidecar"
        >
          <Field label="Target" value={object.targetId} />
          <Field label="Dialect" value={object.spec.dialect} />
          <Field label="Source" value={object.spec.sourceName ?? "unknown"} />
          <Field
            label="Atlas"
            value={
              object.spec.atlasWidth && object.spec.atlasHeight
                ? `${object.spec.atlasWidth} x ${object.spec.atlasHeight}`
                : "unknown"
            }
          />
          <Field label="Subgrids" value={object.spec.grids.length} />
          <Field label="Stackframes" value={object.spec.stackframes.length} />
          <Field label="Frames" value={object.spec.frames.length} />
          <Field label="Animations" value={object.spec.animations.length} />
          <label className="sprite-frame-select">
            <span>Overlay mode</span>
            <select
              value={object.spec.overlay.displayMode}
              onChange={(event) =>
                runCommand({
                  kind: "setSpriteOverlayDisplayMode",
                  sidecarId: object.id,
                  mode: event.currentTarget.value as
                    | "focus"
                    | "cutEdit"
                    | "gridEdit"
                    | "audit"
                    | "debug",
                })
              }
            >
              {SPRITE_OVERLAY_DISPLAY_MODES.map((mode) => (
                <option key={mode} value={mode}>
                  {getSpriteOverlayDisplayModeLabel(mode)}
                </option>
              ))}
            </select>
          </label>
          <ToggleField
            checked={object.spec.overlay.showBounds}
            label="Bounds / cut lines"
            onChange={(value) =>
              runCommand({
                kind: "setSpriteOverlayOption",
                sidecarId: object.id,
                option: "showBounds",
                value,
              })
            }
          />
          <ToggleField
            checked={object.spec.overlay.showSubgrids}
            label="Subgrid regions"
            onChange={(value) =>
              runCommand({
                kind: "setSpriteOverlayOption",
                sidecarId: object.id,
                option: "showSubgrids",
                value,
              })
            }
          />
          <ToggleField
            checked={object.spec.overlay.showExactFrames}
            label="Exact/custom frames"
            onChange={(value) =>
              runCommand({
                kind: "setSpriteOverlayOption",
                sidecarId: object.id,
                option: "showExactFrames",
                value,
              })
            }
          />
          <ToggleField
            checked={object.spec.overlay.showLabels}
            label="All frame labels"
            onChange={(value) =>
              runCommand({
                kind: "setSpriteOverlayOption",
                sidecarId: object.id,
                option: "showLabels",
                value,
              })
            }
          />
          <ToggleField
            checked={object.spec.overlay.selectedOnly}
            label="Legacy selected-only filter"
            onChange={(value) =>
              runCommand({
                kind: "setSpriteOverlayOption",
                sidecarId: object.id,
                option: "selectedOnly",
                value,
              })
            }
          />
          <label className="sprite-frame-select">
            <span>Selected frame</span>
            <select
              value={object.spec.selectedFrameId ?? ""}
              onChange={(event) =>
                runCommand({
                  kind: "selectSpriteFrame",
                  sidecarId: object.id,
                  frameId: event.currentTarget.value || undefined,
                })
              }
            >
              {object.spec.frames.map((frame) => (
                <option key={frame.id} value={frame.id}>
                  {frame.label}
                </option>
              ))}
            </select>
          </label>
          <div className="sprite-frame-list">
            {object.spec.frames.slice(0, 36).map((frame) => (
              <button
                className={
                  object.spec.selectedFrameId === frame.id
                    ? "sprite-frame-card is-selected"
                    : "sprite-frame-card"
                }
                key={frame.id}
                type="button"
                onClick={() =>
                  runCommand({ kind: "selectSpriteFrame", sidecarId: object.id, frameId: frame.id })
                }
              >
                <strong>{frame.label}</strong>
                <small>{getSpriteFrameSummary(frame)}</small>
              </button>
            ))}
          </div>
        </InspectorAccordionGroup>,
      );
    } else if (object.kind === "image") {
      const sidecar = getSpriteSidecarForImage(document, object);
      const currentFrame = sidecar?.spec.frames.find(
        (frame) => frame.id === sidecar.spec.selectedFrameId,
      );
      panels.push(
        <InspectorAccordionGroup
          id="sprite-sidecar"
          key={`${panel.contextKey}:sprite-sidecar`}
          onOpenChange={(open) => panel.setOpen("sprite-sidecar", open)}
          open={panel.isOpen("sprite-sidecar")}
          title="Sprite sidecar"
        >
          {sidecar ? (
            <>
              <Field label="Sidecar" value={sidecar.id} />
              <Field label="Dialect" value={sidecar.spec.dialect} />
              <Field label="Subgrids" value={sidecar.spec.grids.length} />
              <Field label="Stackframes" value={sidecar.spec.stackframes.length} />
              <Field label="Frames" value={sidecar.spec.frames.length} />
              <Field
                label="Overlay mode"
                value={getSpriteOverlayDisplayModeLabel(sidecar.spec.overlay.displayMode)}
              />
              <Field
                label="Selected"
                value={currentFrame ? getSpriteFrameSummary(currentFrame) : "none"}
              />
              <div className="command-row">
                <button
                  type="button"
                  onClick={() =>
                    runCommand({
                      kind: "setSpriteSidecarVisible",
                      sidecarId: sidecar.id,
                      visible: !sidecar.visible,
                    })
                  }
                >
                  {sidecar.visible ? "Hide Sprite Overlay" : "Show Sprite Overlay"}
                </button>
                <button
                  type="button"
                  onClick={() => runCommand({ kind: "detachSpriteSidecar", sourceId: object.id })}
                >
                  Detach Sprite Sidecar
                </button>
              </div>
            </>
          ) : (
            <Field label="Sidecar" value="none" />
          )}
        </InspectorAccordionGroup>,
      );
    }

    const sidecar = object.kind === "image" ? getSpriteSidecarForImage(document, object) : object;
    const image = object.kind === "image" ? object : getSpriteSidecarTarget(document, object);
    panels.push(
      <InspectorAccordionGroup
        id="sprite-audit"
        key={`${panel.contextKey}:sprite-audit`}
        onOpenChange={(open) => panel.setOpen("sprite-audit", open)}
        open={panel.isOpen("sprite-audit")}
        title="Sprite audit"
      >
        {sidecar && image ? (
          <SpriteAuditSectionContent document={document} image={image} sidecar={sidecar} />
        ) : (
          <Field label="Sprite audit" value="linked image or sprite sidecar missing" />
        )}
      </InspectorAccordionGroup>,
    );
    return panels;
  },
};
