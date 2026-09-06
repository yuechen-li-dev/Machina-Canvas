import type {
  CanvasEditorSession,
  CanvasEditorSessionState,
} from "../../core/editor/CanvasEditorSession";
import type { ImageObject } from "../../sceneModel";

export function addImageToEditor(
  session: CanvasEditorSession,
  object: ImageObject,
): CanvasEditorSessionState {
  return session.runCommand({ kind: "addImageObject", object });
}
