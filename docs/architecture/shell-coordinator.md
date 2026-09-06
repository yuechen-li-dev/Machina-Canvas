# Shell and async coordinator

The shell coordinates; it does not implement capability behavior.

```text
browser File / clipboard / download
                ↓
BrowserEditorServices (browser adapter)
                ↓ plain typed values
CanvasEditorAsyncCoordinator (bounded orchestration)
                ↓
module load action → CanvasEditorSession
                ↓
React state projects result/status
```

## Ownership

- `app/browser/BrowserEditorServices.ts` owns `File.text()`, image decoding, clipboard calls, `Blob`, object URLs, and download anchors.
- `app/async/CanvasEditorAsyncCoordinator.ts` owns the finite list of editor async operations and returns `EditorAsyncResult<T>`.
- `modules/*/loadActions.ts` owns parsing, typed object creation, attachment, validation, and selection for its capability.
- `core/editor/CanvasEditorSession.ts` remains framework-free and browser-free.
- `app/shell/CanvasEditorShell.tsx` owns React composition, transient UI state, and invocation wiring.

For example, guide loading is `File → BrowserFileService.readText → coordinator.loadGuideSidecar → guides/loadActions.addGuideSidecar → session.replaceDocument`. The guide action selects the newly created sidecar. Export construction remains semantic code; materialized entries cross to `BrowserExportService` only for copy/download.

This is intentionally not a retry, cancellation, queue, or background-task framework. Add another coordinator method only for a concrete browser-facing editor operation, and keep its parsing or construction in the owning module.
