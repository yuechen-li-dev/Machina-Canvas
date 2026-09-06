# MachinaCanvas capability modules

MachinaCanvas is an LLM-native 2D editor over structured scene records. The editable authority is the `CanvasDocument` plus explicit sidecars; SVG, PNG, TSX, reports, and bundles are derived artifacts.

## Dependency direction

```text
core contracts <- capability modules <- app composition
       ^                  ^              |
       +------ tools / workflows / export+
```

- `src/core/` owns document primitives and static composition contracts. It must not import the React app.
- `src/modules/<capability>/` owns capability records and contributions.
- `src/sceneModel.ts` is the one explicit aggregate-union boundary. It may import core and module record types.
- `src/modules/index.ts` is the one static registration point. There is no dynamic package loading or plugin ABI.
- `src/app/` composes React views and inspector contributions. UI calls typed commands; tools do not mutate React state.
- Existing root files remain compatibility facades while their internals move capability by capability. New capability logic must not be added to those facades.

## Composition contracts

`CanvasModule` is deliberately small. A module can advertise typed tools, modes, export contributors, and the IDs of commands, inspectors, diagnostics, and renderers it owns. `defineCanvasModules` validates non-empty unique module IDs. Aggregators preserve declared order.

Commands use `CanvasCommandDefinition<TDocument, TCommand>`: a stable kind, a type guard, validation that returns diagnostics, and deterministic apply returning document, command, changes, and message. Normal validation does not throw. The current legacy command implementation remains behind `sceneCommands.ts`; new commands register through `src/modules/commandContributions.ts`.

Exports use `CanvasExportContribution.collect(document)`. Contributors return text artifacts and the aggregator rejects duplicate paths, including collisions with core bundle paths. The base exporter still owns `render.svg`, `document.json`, `handoff.toml`, layers, ordinary object files, session commands, and optional TSX.

Tools retain the existing `CanvasToolDefinition` registry. Module tools are flattened into that registry, preserving stable IDs, validation, result cloning, and headless execution.

Modes are module-owned templates flattened into `CANVAS_EDITOR_MODE_TEMPLATES`. Their declared order is product behavior and is tested.

Inspector contributions are compile-time React contributions in `src/app/inspectorContributions.tsx`. A contribution owns a stable ID, supported object kind, and render function. This is not a general UI plugin framework.

## Capability ownership

| Capability | Semantic owner | Current compatibility surfaces |
| --- | --- | --- |
| graphics | `modules/graphics` concept, core shape records | `sceneTemplates.ts`, render code during staged extraction |
| images | `modules/images` | image/alpha/sketch root facades and image tool implementation |
| sprites | `modules/sprites` | sprite parser/editor/audit/compiler root facades |
| guides | `modules/guides` | guide/blockout/alignment root facades |
| mechanical | `modules/mechanical` | mechanical annotation/sheet root facades |
| web UI | `modules/webUi` | UI catalog and TSX lowering root facades |
| stickers | `modules/stickers` | fully local M12A extension proof |

The root facades are intentionally compatible in M12A. Moving each large established implementation wholesale is deferred to bounded follow-up slices; changing import paths without changing ownership would only create churn.

## Static type law

Do not replace object records with `kind: string` and `Record<string, unknown>`. Each module defines discriminated record types using `CanvasObjectBase<LiteralKind>`. `sceneModel.ts` aggregates those records into `CanvasObject`, and `CanvasDocument` remains strongly typed over that union. Exhaustive consumers must handle every new kind.

## Workflows and sidecars

Workflows continue to operate on records and artifacts, never UI click sequences. Guide, blockout, sprite, sketch, and mechanical sidecars remain explicit semantic attachments. Module composition does not change their serialized dialects or authority.

## Deliberate limits

M12A does not add dynamic plugins, persistence redesign, a CAD kernel, generalized blockout lowering, raster painting, a timeline, desktop packaging, a C# port, or a repository split. MachinaCanvas remains AGPL app code; MachinaLayout.JS remains the MIT toolbox dependency.
