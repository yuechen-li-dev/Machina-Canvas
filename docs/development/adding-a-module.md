# Adding a MachinaCanvas module

Use this path for a bounded capability. The Sticker module in `src/modules/stickers/` is the executable example.

1. Create `src/modules/<name>/`. Put semantic record types in `model.ts`; extend `CanvasObjectBase<"literalKind">`.
2. Add the record type to the aggregate `CanvasObject` union and re-export it from `src/sceneModel.ts`. This is the type aggregation point.
3. Put typed commands in the module. Define validation and apply with `defineCanvasCommand`, then add definitions to `src/modules/commandContributions.ts`.
4. Put headless tools in the module. Return commands/results; never mutate React state. Add the tool to the module descriptor.
5. Put all capability React UI under `src/modules/<name>/ui/`. Register inspector UI once in `src/app/inspectorContributions.tsx`; register object renderers and overlays once in `src/app/canvas/objectContributions.tsx`. Every UI contribution has a stable ID, numeric order, explicit `supports` predicate, and either a summary or panel renderer. Do not add a capability branch to `Inspector.tsx`.
6. Put derived artifacts in a `CanvasExportContribution`. Add it to `src/modules/exportContributions.ts`; do not add feature branches to `createCanvasExportBundle`.
7. Add a module descriptor in `src/modules/definitions.ts` and one registration line in `src/modules/index.ts`.
8. Add focused tests for the record, command validation/apply, tool, inspector, artifact, and duplicate registration/path behavior.
9. Add a direct `CanvasEditorSession` test for semantic actions. React tests should cover rendering and event wiring, not duplicate command semantics.

`CanvasEditorSession` is the framework-free semantic boundary. Add generic state transitions there only when they apply across capabilities; keep image, sprite, guide, and mechanical operations in their modules.

For module-specific file loading, accept a plain decoded file value in `src/modules/<name>/loadActions.ts` (or the existing module controller), parse and attach there, and return the resulting document plus command facts. Add the narrow async entry point to `CanvasEditorAsyncCoordinator`; inject browser file/export services in tests. `File`, clipboard, download anchors, and object URLs belong only in `src/app/browser/`. React may own a hidden input ref, but after it receives a `File` it must invoke the coordinator rather than parse or attach locally.

Use `matchKind` from `machinalayout/match` for a total discriminated-union dispatch where exhaustive cases aid review. Keep ordinary type guards for one-off narrowing.

Normally central changes are limited to:

- `src/sceneModel.ts`: one union member and type re-export;
- `src/modules/index.ts`: one module registration line;
- the narrow contribution aggregate for a command, export, or inspector when the contribution cannot live directly on the descriptor.
- the narrow renderer/overlay aggregate when the module adds canvas presentation.
- `CanvasEditorAsyncCoordinator.ts`: one narrow dispatch method only when the module introduces an async browser-facing operation.

Do not add module behavior to `App.tsx`, the legacy command switch, or the base exporter. Do not weaken discriminated unions. Do not invent runtime loading, reflection, a second scene model, hidden sidecar state, or UI macro workflows.

## Contribution checklist

- What semantic records does the module own?
- What commands does it own?
- What tools does it own?
- What inspector or presentation does it own?
- What exports does it own?
- What tests prove it?
- Does it need a mode?
- Does it introduce a module-to-module dependency? If so, can the minimal shared contract move to core?

Run `npm run format`, `npm run format:check`, `npm run lint`, `npm test`, and `npm run build` before handing off. If artifact-producing paths were touched, regenerate the relevant dogfood artifacts and compare filenames and semantic content.
