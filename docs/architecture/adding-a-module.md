# Adding a MachinaCanvas module

Start in `src/modules/<capability>/`. Keep the semantic record, commands, tools, export contributors, and React UI beside the capability that owns them.

## Checklist

1. Define a strongly discriminated record and add it to the aggregate `CanvasObject` union in `src/sceneModel.ts`.
2. Define commands with `defineCanvasCommand`; register them in `src/modules/commandContributions.ts` and list their stable kinds in the module descriptor.
3. Define headless tools as `CanvasToolDefinition` values and list them on the module descriptor in `src/modules/definitions.ts`.
4. Add deterministic export artifacts through `CanvasExportContribution`; register them through the module descriptor. Do not add capability artifacts to the base bundle constructor.
5. Put React UI under `src/modules/<capability>/ui/`.
6. Register inspector UI in `src/app/inspectorContributions.tsx` and renderer/overlay UI in `src/app/canvas/objectContributions.tsx`. Contributions require stable IDs, explicit numeric order, and `supports` predicates.
7. If the capability supplies a mode, contribute its template from the module descriptor. Keep mode construction deterministic.
8. Add direct controller tests plus focused contribution tests. Include duplicate-ID/path protection when adding a new registry kind.

## Where common changes go

- New image tool: `src/modules/images/`, then the image descriptor's `tools` list.
- New sprite audit: `src/modules/sprites/`, then the sprite descriptor's `diagnostics` list.
- New export artifact: a module-local contributor, aggregated by the module descriptor.
- New inspector: module-local component plus one entry in `inspectorContributions.tsx`.
- New object renderer or overlay: module-local component plus one entry in `objectContributions.tsx`.
- New command: module-local definition plus `commandContributions.ts`; do not extend the legacy command switch for new capability commands.

Use `matchKind` from `machinalayout/match` when a total discriminated-union dispatch makes missing cases visible. Prefer an ordinary type guard for a single narrow check.

Do not add a runtime plugin loader, second document model, second command engine, giant context, or module-specific branching in the React shell. Static composition is deliberate.
