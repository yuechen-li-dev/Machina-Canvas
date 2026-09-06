# MACHINA-CANVAS-MODULAR-CORE-M12A report

## 1. Outcome

**Outcome B — substantial cleanup, one bounded monolith remains.** New capabilities now have an obvious, tested static module path, but the established React panels and legacy command implementations have not yet been split by capability. Calling this Outcome A would hide the largest remaining ownership problem.

## 2. Baseline architecture audit

| Concern | Current owner before M12A | Problem | M12A action |
| --- | --- | --- | --- |
| document/types | `sceneModel.ts`, `sceneDocument.ts` | module records mixed into one type file | core generic document plus module-owned records and one aggregate union |
| commands | `sceneCommands.ts` | validation/apply and every capability in one file | typed definition/registry contract; Sticker proves external dispatch; legacy switch retained |
| export | `canvasExport.ts` | base rendering, serialization, and artifact construction mixed | artifact contributor aggregation with duplicate-path protection |
| tools | `tools/*` | good registry, one hard-coded tool list | tools flattened from static module descriptors |
| modes/templates | `editorModes.ts`, `sceneTemplates.ts` | one central list knows every mode | module-owned mode contributions; templates remain compatibility factories |
| React shell | `App.tsx` | 6,836-line UI and domain integration sink | one-line facade and explicit `app/` boundary; Sticker inspector contribution extracted |
| images/alpha | image root files plus `App.tsx` | ownership discoverable only by search | image record ownership and module descriptor established |
| sprites | many `sprite*.ts` files plus `App.tsx` | model/parser/audit/editor/export spread flat | sprite record ownership and contribution metadata established |
| guides/blockout | guide/blockout root files plus `App.tsx` | capability crosses UI, commands, and export | guide record ownership and module descriptor established |
| mechanical | mechanical root files plus `App.tsx` | drafting specifics leak into shell | mechanical record/mode owner established |
| web UI | UI catalog, TSX export, and `App.tsx` | component logic lacks module home | web UI record/mode owner established |
| workflows | `canvasWorkflow.ts`, scripts | sound record/artifact model but graduated paths stale | API preserved; five script roots corrected for standalone repo |

Baseline fan-in evidence: references to `sceneModel` appeared in 90 source/test/script files, `canvasExport` in 46, and `sceneCommands` in 30. Repeated dispatch existed in command validation/application/TOML serialization and React/SVG object rendering. `App.tsx` directly contained image loading, alpha tools, guide/blockout loading, sprite editing/audit, mechanical creation, export checkout/rasterization, terminal orchestration, and all inspectors.

## 3. Largest files before

| File | LOC | Bytes |
| --- | ---: | ---: |
| `src/App.tsx` | 6,836 | 239,793 |
| `src/sceneCommands.ts` | 3,987 | 125,995 |
| `src/canvasExport.ts` | 2,052 | 77,240 |
| `src/sceneModel.ts` | 412 | 8,793 |

## 4. MachinaLayout.JS update

The standalone package incorrectly depended on `file:..`, which resolved to `C:\Users\yuech\source\repos`, and Vite likewise aliased `../src`. M12A now depends on `file:../MachinaLayout.JS`, resolves public entry points from that actual sibling, and uses its current `0.7.0` API. Existing public imports (`machinalayout`, `/machina`, `/match`, `/react`) remain valid, so no library code was copied or upstream patch required. `@types/node` was added because the standalone build includes Node dogfood scripts and previously depended on ambient monorepo types.

## 5–6. Final structure and ownership law

```text
src/
  core/document/model.ts
  core/commands/contracts.ts
  core/modules/types.ts
  modules/{images,sprites,guides,mechanical,webUi,stickers}/
  modules/{definitions,index,commandContributions,exportContributions}.ts
  export/contributions.ts
  app/{CanvasEditorApp,inspectorContributions}.tsx
  sceneModel.ts
  App.tsx
```

Dependency direction is `core contracts <- modules <- app composition`. `sceneModel.ts` is the explicit aggregate-type boundary. Core never imports the React app. Module-to-module dependencies are avoided; shared contracts live in core/export/tool boundaries.

## 7–14. Contribution architecture

`CanvasModule` declares an ID and optional commands, tools, inspectors, exporters, diagnostics, modes, and renderers. `defineCanvasModules` rejects blank and duplicate IDs. This is compile-time composition, not dynamic loading.

The object model stays a discriminated union. Core defines frames, layers, units, base records, and basic shapes. Image, sprite, guide/blockout, mechanical, web UI, and Sticker records live with their capabilities. `CanvasDocument` is the generic core document specialized by the aggregate `CanvasObject` union.

`CanvasCommandDefinition` has `kind`, `is`, `validate`, and `apply`; validation returns explicit diagnostics and apply preserves document/command/change/message results. The Sticker add/rename commands run through this registry. Existing commands remain in the legacy implementation and are the bounded next blocker.

`CanvasExportContribution` returns artifacts; aggregation rejects contributor/contributor and contributor/core path collisions. Sticker emits `stickers/stickers.json` without teaching the bundle constructor its artifact shape. The base exporter still contains established source serialization and SVG rendering.

The existing tool registry remains authoritative. `canvasTools` now flattens module tools, preserving IDs, headless inputs/results, and deterministic cloning. Modes are similarly flattened from module templates in stable tested order. Inspector contributions are a small compile-time React registry; Sticker owns its label editor. Workflows remain record/artifact automation and were not generalized.

## 15–18. Large files after

| File | LOC | Bytes | Result |
| --- | ---: | ---: | --- |
| `src/App.tsx` | 1 | 39 | boring compatibility facade |
| `src/app/CanvasEditorApp.tsx` | 6,960 | 242,015 | remaining bounded React monolith |
| `src/sceneCommands.ts` | 4,218 | 128,135 | module bridge added; legacy implementation remains |
| `src/canvasExport.ts` | 2,099 | 78,795 | contributor seam added; base exporter remains |
| `src/sceneModel.ts` | 84 | 2,226 | materially reduced to aggregation boundary |

Formatting under the now-local Biome configuration accounts for part of the legacy-file LOC increase. The key improvement is ownership and an extension path, not pretending the implementation monoliths disappeared.

## 19–20. Import direction and module mapping

The dependency and ownership maps are in `docs/architecture/modules.md` and `artifacts/machina-canvas-m12a/module-map.json`. Existing capability behavior remains behind compatibility facades while new work is directed to module homes.

## 21–22. Cleanup and deferrals

Cleanup included fixing the broken local package link, restoring standalone Node typings, adding a local formatter/linter policy, replacing unstable React index keys while touching the shell, and correcting five stale post-graduation artifact output roots. The accidental stale `C:\Users\yuech\source\app\artifacts` outputs were identified; deletion was authorized but the environment blocked removal outside configured workspace roots.

Deferred: dynamic plugins, repo split, persistence redesign, generalized blockout lowering, CAD/PDF/DXF, raster painting, animation editor, y-up rewrite, live AI, C# port, and feature-family UI extraction. Code splitting remains deferred; the known large-chunk warning remains.

## 23–24. Fresh Sticker and navigation proof

A fresh-context agent read only the two new architecture guides and completed the proof without editing `App.tsx`, `CanvasEditorApp.tsx`, `canvasExport.ts`, or `sceneCommands.ts`. It added five fixture/test files and corrected one descriptor ID. Four focused files / nine tests pass. It correctly located image tools, sprite audits, export artifacts, inspectors, and commands from the documented structure. See `extension-proof.json`.

## 25–28. Parity, validation, dogfood, and license

- `npm run format`, `format:check`, `lint`, `test`, and `build`: pass.
- Full suite: 52 files, 476 tests pass.
- Build output: 668.45 kB JS / 186.97 kB gzip; known chunk warning retained.
- Mechanical 354, 354 blockout, M40c, and guide-overlay generators: pass after their roots were corrected to this repo.
- TinyTown workflow: passes using currently available inputs, but those inputs differ semantically from the removed/renamed historical Dominatus sources. Drift was inspected and generated changes were restored; checked artifacts remain unchanged. This is why overall artifact parity is not marked fully qualified.
- Package remains private AGPL-3.0-or-later. MachinaLayout.JS remains the external MIT `0.7.0` library; no app code moved upstream.

## 29. C# return-path classification

| Concept | Class | Note |
| --- | --- | --- |
| stable semantic IDs | A | useful across Machina.UI/Aurelian tooling |
| static module contribution model | A | useful if expressed as typed composition, not runtime plugins |
| command result/change model | A | deterministic editor/tooling boundary |
| tool registry | A | headless typed mechanism |
| workflow model | A | record/artifact automation |
| sidecar attachment model | A | explicit semantic relation |
| export provider model | A | composable artifact production |
| sprite audits | C | product/domain logic; reusable concepts may return later |
| alpha tooling | B | editor/tooling-only JS until a native pixel owner exists |
| React shell | B | JS presentation only |
| SVG assumptions | D | transitional rendering assumptions, not return-path contracts |
| mechanical structures | C | product-specific until a separate drafting milestone qualifies reuse |

## 30. Recommended M12B

Proceed with `MACHINA-UI-RETURN-PATH-M12B` only for the Class A contracts, while separately scheduling bounded MachinaCanvas extractions: first image/alpha panels and commands, then sprite panels/commands, then base SVG/object serializer providers. Do not combine that cleanup with a C# port.

## 31. Diff stat

At report time, tracked-file diff stat was 63 files changed, 1,450 insertions, and 7,589 deletions; 36 new files contain the core/module/app structure, six required architecture artifacts, two guides, the milestone report, and five fresh-proof files. Most legacy-file-only changes are deterministic formatting under the newly local Biome configuration; the large deletion is the move of the former `App.tsx` body behind `src/app/CanvasEditorApp.tsx`.
