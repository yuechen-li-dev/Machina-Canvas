import type { MachinaSlotProps } from "machinalayout/react";
import { type ChangeEvent, useEffect, useRef, useState } from "react";
import {
  getOwnerImageForSelection,
  getSelectedObject,
  readViewData,
} from "../../../app/editor/editorShared";
import { InspectorSection } from "../../../app/inspector/shared";
import type { CanvasImageRole, ImageObject, SpriteSidecarObject } from "../../../sceneModel";

export function ImageAssetSection(props: MachinaSlotProps) {
  const {
    document,
    loadBlockoutSidecarFile,
    loadGuideSidecarFile,
    loadImageFile,
    loadSketchOverlayFile,
    loadSpriteSidecarFile,
    runCommand,
  } = readViewData(props);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const alphaInputRef = useRef<HTMLInputElement>(null);
  const spriteInputRef = useRef<HTMLInputElement>(null);
  const guideInputRef = useRef<HTMLInputElement>(null);
  const blockoutInputRef = useRef<HTMLInputElement>(null);
  const sketchInputRef = useRef<HTMLInputElement>(null);
  const selected = getSelectedObject(document);
  const imageObjects = Object.values(document.objects).filter(
    (object): object is ImageObject =>
      object.kind === "image" && (object.role === undefined || object.role === "image"),
  );
  const alphaObjects = Object.values(document.objects).filter(
    (object): object is ImageObject =>
      object.kind === "image" && (object.role === "alphaMap" || object.role === "mask"),
  );
  const spriteSidecars = Object.values(document.objects).filter(
    (object): object is SpriteSidecarObject => object.kind === "spriteSidecar",
  );
  const defaultAlphaId = alphaObjects[0]?.id ?? "";
  const defaultSourceId = imageObjects[0]?.id ?? "";
  const defaultSpriteId = spriteSidecars[0]?.id ?? "";
  const [alphaId, setAlphaId] = useState(defaultAlphaId);
  const [sourceId, setSourceId] = useState(defaultSourceId);
  const [spriteId, setSpriteId] = useState(defaultSpriteId);

  useEffect(() => {
    setAlphaId((current) =>
      current && alphaObjects.some((object) => object.id === current) ? current : defaultAlphaId,
    );
  }, [alphaObjects, defaultAlphaId]);

  useEffect(() => {
    setSourceId((current) =>
      current && imageObjects.some((object) => object.id === current) ? current : defaultSourceId,
    );
  }, [imageObjects, defaultSourceId]);

  useEffect(() => {
    setSpriteId((current) =>
      current && spriteSidecars.some((object) => object.id === current) ? current : defaultSpriteId,
    );
  }, [spriteSidecars, defaultSpriteId]);

  const loadFromInput = (role: CanvasImageRole) => (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = "";
    if (file) void loadImageFile(file, { role });
  };

  const loadSpriteFromInput = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = "";
    const targetId = getOwnerImageForSelection(document, selected)?.id;
    if (file) void loadSpriteSidecarFile(file, { targetId });
  };

  const loadSketchFromInput = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = "";
    const targetId = getOwnerImageForSelection(document, selected)?.id;
    if (file) void loadSketchOverlayFile(file, { targetId });
  };

  const loadGuideFromInput = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = "";
    const targetId = getOwnerImageForSelection(document, selected)?.id;
    if (file) void loadGuideSidecarFile(file, { targetId });
  };

  const loadBlockoutFromInput = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = "";
    const targetObjectId = selected?.id;
    if (file) void loadBlockoutSidecarFile(file, { targetObjectId });
  };

  return (
    <InspectorSection title="Image assets">
      <input
        ref={imageInputRef}
        className="asset-file-input"
        type="file"
        accept="image/png,image/jpeg,image/webp,image/svg+xml"
        onChange={loadFromInput("image")}
      />
      <input
        ref={alphaInputRef}
        className="asset-file-input"
        type="file"
        accept="image/png,image/jpeg,image/webp,image/svg+xml"
        onChange={loadFromInput("alphaMap")}
      />
      <input
        ref={spriteInputRef}
        className="asset-file-input"
        type="file"
        accept=".toml,.sprite.toml,.spriteforge.toml,text/plain"
        onChange={loadSpriteFromInput}
      />
      <input
        ref={guideInputRef}
        className="asset-file-input"
        type="file"
        accept=".toml,.guide.toml,text/plain"
        onChange={loadGuideFromInput}
      />
      <input
        ref={blockoutInputRef}
        className="asset-file-input"
        type="file"
        accept=".toml,.blockout.toml,text/plain"
        onChange={loadBlockoutFromInput}
      />
      <input
        ref={sketchInputRef}
        className="asset-file-input"
        type="file"
        accept=".toml,.sketch.toml,text/plain"
        onChange={loadSketchFromInput}
      />
      <div className="asset-actions">
        <button type="button" onClick={() => imageInputRef.current?.click()}>
          Load image
        </button>
        <button type="button" onClick={() => alphaInputRef.current?.click()}>
          Load alpha map
        </button>
        <button type="button" onClick={() => guideInputRef.current?.click()}>
          Load guide sidecar
        </button>
        <button type="button" onClick={() => blockoutInputRef.current?.click()}>
          Load blockout sidecar
        </button>
        <button type="button" onClick={() => sketchInputRef.current?.click()}>
          Load sketch overlay
        </button>
        <button type="button" onClick={() => spriteInputRef.current?.click()}>
          Load sprite sidecar
        </button>
      </div>
      {selected?.kind === "image" &&
      (selected.role === undefined || selected.role === "image") &&
      alphaObjects.length > 0 ? (
        <div className="asset-select-row">
          <select
            aria-label="Alpha map object"
            value={alphaId}
            onChange={(event) => setAlphaId(event.currentTarget.value)}
          >
            {alphaObjects.map((object) => (
              <option key={object.id} value={object.id}>
                {object.name}
              </option>
            ))}
          </select>
          <button
            type="button"
            disabled={!alphaId}
            onClick={() =>
              runCommand({
                kind: "attachAlphaMap",
                sourceId: selected.id,
                alphaId,
              })
            }
          >
            Attach alpha
          </button>
        </div>
      ) : null}
      {selected?.kind === "image" &&
      (selected.role === "alphaMap" || selected.role === "mask") &&
      imageObjects.length > 0 ? (
        <div className="asset-select-row">
          <select
            aria-label="Source image object"
            value={sourceId}
            onChange={(event) => setSourceId(event.currentTarget.value)}
          >
            {imageObjects.map((object) => (
              <option key={object.id} value={object.id}>
                {object.name}
              </option>
            ))}
          </select>
          <button
            type="button"
            disabled={!sourceId}
            onClick={() =>
              runCommand({
                kind: "attachAlphaMap",
                sourceId,
                alphaId: selected.id,
              })
            }
          >
            Use as alpha
          </button>
        </div>
      ) : null}
      {selected?.kind === "image" && selected.alphaMapId ? (
        <button
          className="asset-wide-button"
          type="button"
          onClick={() => runCommand({ kind: "detachAlphaMap", sourceId: selected.id })}
        >
          Detach alpha map
        </button>
      ) : null}
      {selected?.kind === "image" &&
      (selected.role === undefined || selected.role === "image") &&
      spriteSidecars.length > 0 ? (
        <div className="asset-select-row">
          <select
            aria-label="Sprite sidecar object"
            value={spriteId}
            onChange={(event) => setSpriteId(event.currentTarget.value)}
          >
            {spriteSidecars.map((object) => (
              <option key={object.id} value={object.id}>
                {object.name}
              </option>
            ))}
          </select>
          <button
            type="button"
            disabled={!spriteId}
            onClick={() =>
              runCommand({
                kind: "attachSpriteSidecar",
                sourceId: selected.id,
                sidecarId: spriteId,
              })
            }
          >
            Attach sprite
          </button>
        </div>
      ) : null}
      {selected?.kind === "image" && selected.spriteSidecarId ? (
        <button
          className="asset-wide-button"
          type="button"
          onClick={() => runCommand({ kind: "detachSpriteSidecar", sourceId: selected.id })}
        >
          Detach sprite sidecar
        </button>
      ) : null}
      {selected ? (
        <button
          className="asset-wide-button"
          type="button"
          onClick={() => runCommand({ kind: "removeObject", id: selected.id })}
        >
          Remove selected
        </button>
      ) : null}
      {selected?.kind === "image" && selected.role === "alphaMap" ? (
        <p className="empty-note">Attach it to an image with Attach Alpha.</p>
      ) : null}
    </InspectorSection>
  );
}
