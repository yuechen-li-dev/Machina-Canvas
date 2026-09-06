import type { CanvasDocument } from "../sceneModel";

export type CanvasExportArtifact = {
  path: string;
  mimeType: string;
  text: string;
};
export type CanvasExportContribution = {
  readonly id: string;
  readonly collect: (document: CanvasDocument) => readonly CanvasExportArtifact[];
};

export function collectCanvasModuleExportArtifacts(
  document: CanvasDocument,
  contributions: readonly CanvasExportContribution[],
  reservedPaths: ReadonlySet<string> = new Set(),
): readonly CanvasExportArtifact[] {
  const seen = new Set(reservedPaths);
  const artifacts: CanvasExportArtifact[] = [];
  for (const contribution of contributions) {
    for (const artifact of contribution.collect(document)) {
      if (seen.has(artifact.path)) {
        throw new Error(
          `Canvas export contribution "${contribution.id}" produced duplicate path "${artifact.path}".`,
        );
      }
      seen.add(artifact.path);
      artifacts.push({ ...artifact });
    }
  }
  return artifacts;
}
