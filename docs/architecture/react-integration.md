# React integration architecture

MachinaCanvas treats React as a host for an editor session, not as the owner of editor semantics.

## Ownership

`CanvasEditorSession` in `src/core/editor/CanvasEditorSession.ts` is framework-free. It owns mode changes, document mutation through commands, selection, registered tool execution, export-cart selection, and bundle creation. It exposes `getSnapshot()` and `subscribe()` so React, tests, scripts, or another host can drive the same contract.

`src/app/shell/CanvasEditorShell.tsx` is the React composition root. It renders session-derived state and retains transient browser concerns such as open accordions, text-entry buffers, clipboard/download status, and pointer interaction state. Semantic actions delegate to the session or an existing typed domain command.

Browser `File` decoding is isolated in `src/app/files/browserFileLoading.ts`. Parsed image/text values cross into domain code; `FileReader`, object URLs, input resets, and drag/drop details do not belong in core or capability models.

## UI contribution points

Object renderers and canvas overlays register in `src/app/canvas/objectContributions.tsx`. Every contribution has a stable non-empty `id`, numeric `order`, a `supports` predicate, and a render function. Registries reject duplicate IDs and sort by `(order, id)`.

Inspector contributions register in `src/app/inspectorContributions.tsx` with the same stable-ID, ordering, and predicate law. A module owns its renderer, overlay, inspector, command, tool, and export implementation; the app-level registry only composes them.

Capability UI locations:

- images: `src/modules/images/ui/`
- sprites: `src/modules/sprites/ui/`
- guides and blockout: `src/modules/guides/ui/`
- mechanical drafting: `src/modules/mechanical/ui/`
- web/UI: `src/modules/webUi/ui/`
- Sticker extension proof: `src/modules/stickers/ui/` and adjacent module files

The canvas host owns pointer-to-canvas coordinate conversion and transient drag state. Capability overlays render semantic projections and emit typed commands; they do not mutate objects directly.

## MatchKind

Use `matchKind` from `machinalayout/match` for total dispatch over a discriminated `kind` union when every variant should be reviewed together. `SceneObjectSvg` uses it for built-in object rendering after module contributions get first refusal. Keep simple type guards for one-off narrowing and validation; do not turn every predicate into a matcher.

## Dependency direction

```text
core contracts and editor session
        ^
module models, commands, tools, exporters
        ^
module-owned React contributions
        ^
app registries and thin shell
```

Core never imports React. Capability modules may import app-level contribution type contracts as type-only imports. The shell may compose all capabilities, but capability implementation does not move back into the shell.

## Testing

Test semantic workflows directly against `CanvasEditorSession` before mounting React. Renderer, overlay, and inspector contributions receive focused component tests. Integration tests should prove a contribution is discoverable by its stable ID and that emitted commands update the session snapshot.
