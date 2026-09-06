import type {
  CanvasEditorSession,
  CanvasEditorSessionState,
} from "../../core/editor/CanvasEditorSession";
import type { MechanicalNoteAnnotation } from "../../mechanicalAnnotations";
import { addMechanicalNote } from "../../sceneCommands";
import type { CanvasDocument } from "../../sceneModel";

export function addMechanicalNoteToEditor(
  session: CanvasEditorSession,
  sidecarId: string,
  note: MechanicalNoteAnnotation,
): CanvasEditorSessionState {
  const document: CanvasDocument = addMechanicalNote(
    session.getSnapshot().document,
    sidecarId,
    note,
  );
  return session.replaceDocument(document, `mechanical note ${note.id} added`);
}
