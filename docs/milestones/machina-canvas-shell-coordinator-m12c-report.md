# MACHINA-CANVAS-SHELL-COORDINATOR-M12C report

## 1. Outcome

**Outcome A — the cleanup is complete enough to enter product work.** Browser APIs, bounded async orchestration, capability load semantics, and guide/mechanical inspector bodies now have obvious owners. Both composition files are below 600 lines, fresh-context locality probes passed, and no C# or VN work was added.

## 2. M12B baseline

M12B left a seven-line `CanvasEditorApp.tsx`, a framework-free 259-line `CanvasEditorSession`, module-owned sprite presentation, and stable inspector/renderer/overlay registries. Its named blockers were the 1,201-line shell and approximately 1,200-line inspector. M12C preserved those contracts rather than redesigning the session or module system.

## 3. Shell responsibility audit

| Remaining responsibility | M12B file | Correct owner | M12C action |
| --- | --- | --- | --- |
| panel/mode composition | `CanvasEditorShell.tsx` | shell | retained |
| browser file decode | shell/file facade | browser service | moved |
| image/sketch construction | shell | images module | moved |
| sprite parse/attach | shell | sprites module | moved |
| guide/blockout parse/attach | shell | guides module | moved |
| mechanical sidecar creation | shell | mechanical module | moved |
| export/checkpoint/raster orchestration | shell | coordinator/export presenter | moved |
| clipboard/object URL/download | shell and `exportCart.ts` | browser export service | moved |
| command/tool invocation status | shell | shell/session | retained |
| transient inputs/collapse state | shell | React host | retained |

## 4. Final shell structure

`CanvasEditorShell` creates the session and coordinator, hosts top-level React state, routes mode selection, invokes generic actions, builds `AppViewData`, and renders `MachinaReactView`. The focused `useCanvasExportPresenter` owns export UI state and calls the coordinator; it is not a general shell split or task framework.

## 5. Browser service architecture

`BrowserEditorServices.ts` defines injectable file and export interfaces. It is the sole owner of `File.text`, image-file normalization, clipboard calls, object URLs, download anchors, and browser checkout realization. `browserFileLoading.ts` remains a compatibility forwarding facade.

## 6. Async coordinator architecture

`CanvasEditorAsyncCoordinator` is 318 lines of plain TypeScript with no React import. Its finite method set covers image, sketch, sprite, guide, blockout, mechanical, semantic export, raster, checkout, checkpoint, copy, and download invocation. Operations return `EditorAsyncResult<T>` and accepted document operations synchronize `CanvasEditorSession`.

## 7. Module-specific load ownership

Image and sketch construction live in `modules/images/loadActions.ts`; sprite parsing/attachment lives in `modules/sprites/loadActions.ts`; guide and blockout parsing/attachment live in `modules/guides/loadActions.ts`; mechanical creation lives in `modules/mechanical/loadActions.ts`. Each action accepts plain values and returns document/command facts.

## 8. Status and error handling

The coordinator normalizes caught failures into explicit error results. Modules/parser exceptions supply semantic messages, browser services supply environment failures, and React projects those messages in existing status surfaces. Failures are neither alerted nor swallowed.

## 9. Export and download boundary

`canvasExport.ts` remains canonical semantic bundle/serializer code. `exportCart.ts` now materializes plain checkout entries without DOM APIs. The coordinator hands those entries to `BrowserExportService`; the export presenter only maintains UI selection/status.

## 10. Checkpoint boundary

Checkpoint artifact semantics remain in `exportCart.ts`. The coordinator creates/materializes the checkpoint and the injected browser service realizes its download. No persistence redesign was introduced.

## 11. Inspector responsibility audit

The prior inspector mixed generic selection, geometry, viewport, metadata, tools, export, and diagnostics with sprite, guide, blockout, mechanical, image, and web UI bodies. Guide/blockout and mechanical panels moved to their modules; the already-extracted sprite and web UI components gained registered panel owners. Generic panels remain central.

## 12. Guide inspector extraction

`GuideInspectorContribution.tsx` owns guide visibility, opacity, label display, alignment, sidecar metadata, validation, and blockout controls. Its explicit predicate supports guide owners, guide sidecars, and blockout sidecars. No guide-specific branch remains in `Inspector.tsx`.

## 13. Mechanical inspector extraction

`MechanicalInspectorContribution.tsx` owns sheet metadata, counts, reference summaries, notices, and diagnostics. It reuses existing mechanical facts and adds no CAD, solver, PDF, DXF, or dimension functionality.

## 14. Final Inspector composition law

`Inspector.tsx` composes selection summary, matching ordered module contributions, generic geometry/viewport, global tools/image-host controls, metadata, export, and diagnostics. Contributions retain stable IDs, deterministic `(order, id)` sorting, explicit predicates, duplicate rejection, and static registration.

## 15. CanvasEditorShell before and after

| State | LOC | Bytes |
| --- | ---: | ---: |
| M12B before | 1,201 | 42,241 |
| M12C after | 597 | 20,295 |

The 50% reduction reflects actual browser/module/export ownership moves, not a two-file half split.

## 16. Inspector before and after

| State | LOC | Bytes |
| --- | ---: | ---: |
| M12B before | 1,200 | 49,487 |
| M12C after | 565 | 22,639 |

## 17. Largest files after

| File | LOC | Bytes |
| --- | ---: | ---: |
| `CanvasEditorShell.tsx` | 597 | 20,295 |
| `Inspector.tsx` | 565 | 22,639 |
| `CanvasEditorAsyncCoordinator.ts` | 318 | 11,303 |
| `useCanvasExportPresenter.ts` | 272 | 9,467 |
| `GuideInspectorContribution.tsx` | 248 | 9,509 |
| `MechanicalInspectorContribution.tsx` | 84 | 3,658 |
| `BrowserEditorServices.ts` | 93 | 2,809 |
| `CanvasEditorSession.ts` | 259 | 9,103 |

No new file exceeds 600 lines. The pre-existing `SpriteInspectorSections.tsx` remains above that threshold and was not expanded with the extracted 243-line sprite contribution.

## 18. Direct coordinator tests

`canvas-editor-async-coordinator.test.ts` has eight framework-free tests covering image, sprite, guide, blockout, mechanical, export, fake-browser checkout, and checkpoint paths.

## 19. Browser adapter tests

`browser-editor-services.test.ts` covers text normalization, image input normalization, clipboard delegation, object URL creation, anchor click, cleanup, and URL revocation without overmocking semantic code.

## 20. React integration tests

`canvas-editor-shell.test.tsx` mounts the real shell, enters graphics mode, sends a real guide `File` through the hidden input/coordinator path, proves selection/inspector rerender, and proves parser failures reach the visible status surface. Existing mode, panel, cart, terminal, and module UI tests remain.

## 21. Guide inspector tests

Module-local tests prove the predicate, visibility action through `CanvasEditorSession`, opacity control, the fresh label affordance, and guide display state update. The collision-sensitive load regression proves attachment and exact selection.

## 22. Mechanical inspector tests

The module-local test proves the predicate and renders existing A4 sheet facts and diagnostic output from the module contribution. Creation/session flow is independently covered by coordinator tests.

## 23. Fresh extension proof

A fresh-context agent added a `Guide labels` checkbox using the existing `showLabels` display field and a Guides-owned registered command. It did not edit `Inspector.tsx` or `CanvasEditorShell.tsx` and added no capability-specific host branch. Exact files are recorded in `extension-proof.json`.

## 24. Fresh bug-fix proof

The reported defect was real in the former shell implementation. The extracted guide action now returns the new guide as `selectedObjectId`; the coordinator installs that document in the session. A fresh agent added a same-name collision regression proving `image-guide-sidecar-2` is attached and selected in both result and session.

## 25. Repository navigation proof

A separate read-only fresh agent correctly located browser APIs in `app/browser`, async operations in `app/async`, guide and mechanical UI in their module `ui` folders, download invocation in the export presenter/browser service, materialization in `exportCart.ts`, and canonical bundle construction in `canvasExport.ts`.

## 26. Dogfood validation

All five real package scripts passed: TinyTown, mechanical 354, mechanical 354 blockout, mechanical M40c, and guide overlay.

## 27. Artifact parity

The three mechanical workflows regenerated without tracked drift. TinyTown regenerated with the already-documented current-input semantic drift, and guide-overlay JSON regenerated with formatting drift. Those tracked changes and the new workflow manifest were inspected and restored/removed; historical artifacts remain unchanged. Parity is therefore conservatively unqualified, matching M12B.

## 28. Package and license validation

`npm pack --dry-run --json` passed with 310 entries and no bundled dependency package. MachinaCanvas remains private and `AGPL-3.0-or-later`; sibling MachinaLayout.JS remains `0.7.0` and MIT. No app code moved upstream.

## 29. Easy refactors performed

Browser glue was removed from `exportCart.ts`; repeated shell try/catch/status blocks became one result path; the redundant export dependency-heavy memo was removed; inspector contributions gained separate summary/panel surfaces; module command dispatch became generic instead of Sticker-specific; `matchKind` now also handles coordinator result routing. The new shell test exposed and removed invalid nested attachment-row buttons while preserving keyboard selection and the visibility action.

## 30. Deferred items

Deferred unchanged: cancellation/retry/task scheduling, undo/redo, dynamic plugins, desktop file APIs, persistence redesign, code splitting, raster editing, animation tooling, and all VN functionality. The existing build chunk-size warning remains.

## 31. C# second consumer

No real second C# consumer was discovered. MachinaCanvas contains no C# source or project, and M12C produced no evidence that justifies porting the return-path contracts now.

## 32. Exact recommendation

Skip M12D and proceed directly to **RENC#-VN-M13**.

## 33. Diff stat

Before adding this report/evidence, tracked changes were 13 files with 242 insertions and 1,487 deletions, plus focused new coordinator/service/module/test/doc files and nine required JSON artifacts. The dominant deletion is the removal of shell and inspector capability bodies; no generated dogfood drift remains.
