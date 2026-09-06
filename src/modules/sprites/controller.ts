import type {
  CanvasEditorSession,
  CanvasEditorSessionState,
} from "../../core/editor/CanvasEditorSession";

export function selectSpriteFrameInEditor(
  session: CanvasEditorSession,
  sidecarId: string,
  frameId: string,
): CanvasEditorSessionState {
  return session.runCommand({ kind: "selectSpriteFrame", sidecarId, frameId });
}
