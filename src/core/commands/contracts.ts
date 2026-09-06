import type { ReferenceGridConfig } from "../../referenceGrid";

export type CanvasCommandLike = { readonly kind: string };
export type CanvasCommandValidationContext = {
  referenceGrid?: Partial<ReferenceGridConfig>;
};
export type CanvasCommandApplyContext = {
  referenceGrid?: Partial<ReferenceGridConfig>;
  spriteFrameEditSettings?: { constrainFrameEditsToGuideRegion?: boolean };
};
export type CanvasCommandValidationDiagnostic = {
  severity: "error" | "warning";
  code: string;
  message: string;
  commandIndex?: number;
  objectId?: string;
};
export type CanvasCommandValidationResult = {
  ok: boolean;
  diagnostics: CanvasCommandValidationDiagnostic[];
};
export type CanvasCommandChange = {
  objectId: string;
  field: string;
  before: unknown;
  after: unknown;
};
export type CanvasCommandApplyResult<
  TDocument,
  TCommand extends CanvasCommandLike = CanvasCommandLike,
> = {
  document: TDocument;
  command: TCommand;
  changes: CanvasCommandChange[];
  message: string;
};

export type CanvasCommandDefinition<TDocument, TCommand extends CanvasCommandLike> = {
  readonly kind: TCommand["kind"];
  is(command: CanvasCommandLike): command is TCommand;
  validate(
    document: TDocument,
    command: TCommand,
    commandIndex?: number,
    context?: CanvasCommandValidationContext,
  ): readonly CanvasCommandValidationDiagnostic[];
  apply(
    document: TDocument,
    command: TCommand,
    context?: CanvasCommandApplyContext,
  ): CanvasCommandApplyResult<TDocument, TCommand>;
};

export function defineCanvasCommand<TDocument, TCommand extends CanvasCommandLike>(
  definition: CanvasCommandDefinition<TDocument, TCommand>,
): CanvasCommandDefinition<TDocument, TCommand> {
  return Object.freeze({ ...definition });
}

export function defineCanvasCommandRegistry<TDocument>(
  definitions: readonly CanvasCommandDefinition<TDocument, CanvasCommandLike>[],
): ReadonlyMap<string, CanvasCommandDefinition<TDocument, CanvasCommandLike>> {
  const registry = new Map<string, CanvasCommandDefinition<TDocument, CanvasCommandLike>>();
  for (const definition of definitions) {
    const kind = definition.kind.trim();
    if (kind.length === 0) throw new Error("Canvas command kind must be non-empty.");
    if (registry.has(kind)) throw new Error(`Duplicate canvas command kind "${kind}".`);
    registry.set(kind, definition);
  }
  return registry;
}
