# MACHINA-CANVAS-REACT-INTEGRATION-M12B report

## 1. Outcome

**Outcome B — the 6,960-line React monolith is gone, with one bounded legacy integration seam remaining.** The former file is a seven-line facade; capability renderers and substantial inspector sections are module-owned; the framework-free session is directly qualified. `CanvasEditorShell.tsx` (1,201 lines) still coordinates browser async loading/export state, and `Inspector.tsx` (1,200 lines) still composes several legacy built-in sections. Both are much smaller, named, and isolated; calling the shell fully boring would overstate the result.

## 2. M12A baseline confirmation

M12A's static module registry, capability-owned records, command/export/tool/mode contributions, Sticker proof, one-line `App.tsx`, and headless command/export paths remain intact. The M12A report correctly identified `src/app/CanvasEditorApp.tsx` at 6,960 lines as the next blocker.

## 3. React monolith responsibility audit

| Responsibility | Approximate prior weight | Owner before M12B | Owner after M12B |
| --- | ---: | --- | --- |
| state, modes, commands, selection, tools | 1,150 LOC | React root | `CanvasEditorSession` plus shell adapter |
| file and sidecar loading | 520 LOC | React root | browser boundary plus bounded shell coordinator |
| sprite render/edit/audit | 1,150 LOC | React root | `modules/sprites/ui` and controller |
| guides/blockout | 620 LOC | React root | `modules/guides/ui` |
| mechanical presentation | 650 LOC | React root | `modules/mechanical/ui` and controller |
| image/Web UI inspectors | 430 LOC | React root | `modules/images/ui`, `modules/webUi/ui` |
| canvas, viewport, pointer interaction | 760 LOC | React root | `app/canvas`, focused interaction helpers |
| inspector composition | 1,100 LOC | React root | contribution registry plus bounded legacy host |
| export/cart/checkpoint/raster | 500 LOC | React root | domain exporters/session plus shell browser adapter |
| terminal, panels, transient UI | 280 LOC | React root | focused shell/panel components |

## 4. Final editor/controller architecture

`src/core/editor/CanvasEditorSession.ts` is a 259-line plain TypeScript session with inspectable immutable snapshots, subscription, mode switching, command dispatch, selection, tools, export cart, and bundle creation. Image, sprite, and mechanical operations have module-local controller functions. React instantiates the session and delegates semantic mode, command, and tool actions.

## 5. Semantic versus transient state

Session state contains document, viewport, mode, selection (inside the document), command log/results, tool result, export artifacts/cart, and bundle. React retains accordion/collapse flags, input buffers, file inputs, pointer/drag/hover state, clipboard/download status, and DOM refs. Async status remains a deliberately bounded shell concern; a general task framework was rejected.

## 6. Final React directory/component structure

```text
src/app/
  CanvasEditorApp.tsx                  facade exports
  shell/{CanvasEditorShell,SceneTree,AuxiliaryViews}.tsx
  canvas/{CanvasPanel,SceneObjectRenderer,AidOverlays,interactions,objectContributions}.*
  inspector/{Inspector,InspectorPanels,CanvasToolsSection,shared}.tsx
  files/browserFileLoading.ts
```

| Area | Owner law |
| --- | --- |
| `core/` | framework-free document, command, module, and editor-session contracts |
| `modules/` | capability meaning, actions, tools, exports, and capability React UI |
| `app/` | static contribution aggregation and browser/React integration |
| React components | projection, event wiring, and transient UI state only |
| `canvasWorkflow.ts` / `scripts/workflow/` | headless record-to-artifact automation |
| `export/`, `canvasExport.ts`, `exportCart.ts` | base export, module providers, cart, validation, and materialization |

## 7. Module-owned UI structure

```text
modules/images/ui/{ImageAssetSection,SketchOverlaySvg}.tsx
modules/sprites/ui/{SpriteInspectorSections,SpriteSidecarSvg}.tsx
modules/guides/ui/{GuideAlignmentSection,GuideSidecarSvg,BlockoutSidecarSvg}.tsx
modules/mechanical/ui/MechanicalAnnotationSidecarSvg.tsx
modules/webUi/ui/UiPropEditor.tsx
modules/stickers/ui/{renderer,overlay}.tsx
```

## 8. Inspector contribution model

Inspector contributions now require a stable non-empty ID, numeric order, explicit `supports(object)` predicate, and render function. Registration is explicit, duplicate IDs fail, and order is deterministic by `(order, id)`. Sticker proves module-local rendering and command emission.

## 9. Overlay contribution model

`objectContributions.tsx` supplies narrow renderer and overlay surfaces with the same identity/order/support laws. The selected Sticker label overlay is owned by the Sticker module. This is static composition, not runtime plugin loading.

## 10. Tool/panel contribution model

The established `CanvasToolDefinition` registry remains the tool contribution surface; `CanvasToolsSection` projects registered tools. `create-sticker` proves a module tool reaches the common panel without shell branching. A second generalized panel framework was not introduced.

## 11. Canvas surface decomposition

`CanvasPanel` is 544 lines and hosts the artboard traversal. Built-in shapes live in `SceneObjectRenderer`; aid overlays are separate; image, sprite, guide/blockout, and mechanical overlays live with their modules. The mechanical renderer is the largest overlay at 492 lines.

## 12. Pointer/drag architecture

DOM listener lifecycle remains in React. Coordinate mapping, pan begin/resolve, drag advance, and changed-frame detection are explicit pure helpers in `app/canvas/interactions.ts` with direct tests. Sprite snapping and guide constraints remain in their existing semantic modules; no generic gesture framework was added.

## 13. File-loading boundary

`app/files/browserFileLoading.ts` is the only new browser `File` read/decode boundary. It returns plain text/image inputs. Module parsing and typed commands remain headless. The remaining orchestration callbacks in `CanvasEditorShell` are the exact Outcome B follow-up.

## 14. Export UI boundary

Artifact providers, cart reconciliation, bundle construction, validation, and materialization remain domain functions or session actions. React displays choices and invokes them. Browser clipboard, object URLs, and downloads remain presentation glue. No serializer moved into React.

## 15. Headless parity

The controller suite initializes and switches modes, dispatches commands, selects objects, runs a registered tool, updates the export cart, creates a bundle, and exercises image, sprite, and mechanical module controllers without React.

## 16. Direct controller tests

`test/core/canvas-editor-session.test.ts` contains 12 direct tests. It covers all required operations, exact-once handling for already-applied tool documents, and all four populated workflows (`graphics`, `webUi`, `sprites`, `mechanical`) in addition to blank initialization.

## 17. React tests

Existing UI tests remain. New focused tests cover contribution rendering, overlay visibility, pointer helpers, and a full Sticker inspector-to-session-to-preview rerender. Semantic assertions are concentrated in controller/module tests.

## 18. Largest files before and after

| Before | LOC | After replacement/decomposition | LOC |
| --- | ---: | --- | ---: |
| `app/CanvasEditorApp.tsx` | 6,960 | same facade | 7 |
| — | — | `app/shell/CanvasEditorShell.tsx` | 1,201 |
| — | — | `app/inspector/Inspector.tsx` | 1,200 |
| — | — | `modules/sprites/ui/SpriteInspectorSections.tsx` | 948 |
| — | — | `app/canvas/CanvasPanel.tsx` | 544 |
| — | — | `core/editor/CanvasEditorSession.ts` | 259 |

No controller or replacement React file is remotely near 6,960 lines.

## 19. Fresh Sticker UI extension proof

A fresh-context agent followed the contribution docs and verified/extended the typed record, label inspector, renderer, selected-label overlay, `create-sticker` action, and sorted deterministic export. It touched `src/modules/stickers/export.ts` and module tests only; no central React file changed.

## 20. Fresh Sticker bug-fix proof

The reported “Sticker label does not update in inspector preview” defect was not reproducible on the decomposed path. A fresh agent added `inspector-preview.test.tsx`, applying the real emitted `renameSticker` through `CanvasEditorSession` and rerendering the inspector, canvas label, and overlay. All update to `Reviewed`. The previous gap was test coverage that stopped at command emission; no speculative production patch was made.

## 21. Artifact parity

Mechanical 354, blockout, and M40c regenerated without hash drift. TinyTown currently differs from checked-in historical outputs (compiled source-kind/report/PNG content), and guide-overlay JSON differs by formatting after regeneration. Those regenerated stale changes were removed/restored rather than accepted. This is not claimed as historical artifact parity.

## 22. Dogfood validation

All five current scripts completed successfully through their real paths: TinyTown, mechanical 354, mechanical 354 blockout, mechanical M40c, and guide overlay. Output parity is reported separately above.

## 23. MachinaLayout.JS usage changes

The existing 0.7.0 dependency remains. `SceneObjectSvg` now uses `matchKind` from `machinalayout/match` for exhaustive built-in `CanvasObject.kind` rendering after module renderers get first refusal; terminal side-effect dispatch uses the same total-union pattern. Simple narrowing predicates remain ordinary guards.

## 24. C# return-path classification

The required 16-row audit is in `csharp-return-path.json`. Summary: typed static module composition and artifact-provider collision laws are candidate A; semantic IDs, headless pipelines, immutable dispatch, transient/presenter separation, and viewport/input contracts already exist (B); the Canvas object aggregate is product-specific (C); tool catalogs, inspectors, sessions, sidecars, sprite/alpha tooling, workflows, and modes are future Oblivion/editor concerns (D).

## 25. Machina.UI candidates

Only reusable laws should return: domain-specific typed IDs, deterministic composition, typed validation/apply result records when a second consumer exists, and renderer-neutral artifact provider contracts when repeated. Existing `UiActionId`, `NodeId`, `DispatchTable<TState>`, `MachinaPresentationPipeline`, `MachinaPresentationViewport`, and input/hit-test contracts already cover much of this ground.

## 26. Oblivion candidates

Inspector/presenter facts, editor session/controller, command log, scene diagnostics, sidecar editors, tool/workflow catalogs, artifact/cart UI, and mode templates fit future Oblivion/editor tooling better than runtime Machina.UI.

## 27. Concepts explicitly rejected from C# port

Do not port the React shell, browser File APIs, SVG assumptions, mechanical editor forms, a giant Canvas editor state, or dynamic plugin loading into Machina.UI. Aurelian.Machina should continue translating immutable presentation intent; it should not become the editor.

## 28. Deferred milestones

Deferred: undo/redo (the change-result records make it plausible, but it deserves a dedicated design), full state-manager rewrite, task framework/cancellation, dynamic plugins, desktop packaging, project database, collaboration, animation timeline, raster editor, VN authoring, C# port, Copeland frontend, and Oblivion implementation.

## 29. Validation totals

`npm run format`, `format:check`, and `lint` pass. The full suite passes **55 files / 493 tests**. The Vite production build passes with only its existing large-chunk warning. All five dogfood scripts complete. `npm pack --dry-run --json` passes with 281 entries; the package remains private/AGPL and bundles no dependency package. Focused controller/interaction/Sticker lanes also pass.

## 30. Diff stat

The principal structural change deletes roughly 6,960 lines from the monolith and redistributes behavior into focused files. The final `git diff --stat` is intentionally reported at handoff because M12A and M12B changes coexist in the uncommitted workspace.

## 31. Exact next milestone

Run **MACHINA-CANVAS-SHELL-COORDINATOR-M12C** only: move browser async image/sidecar/checkpoint/export orchestration out of `CanvasEditorShell`, and move the remaining built-in guide/mechanical inspector bodies out of `Inspector.tsx`, targeting sub-600-line composition files. Do not start VN work or a C# port in that milestone. After it reaches Outcome A, choose the small **MACHINA-UI-RETURN-PATH-M12D** contract port before `RENC#-VN-M13` only if a real second C# consumer is identified; otherwise enter the VN arc directly.
