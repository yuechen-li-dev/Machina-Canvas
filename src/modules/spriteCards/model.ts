export type SpriteCardSourceRect = {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
};

export type SpriteCardAllocation =
  | { readonly kind: "fixed"; readonly length: number }
  | { readonly kind: "flex"; readonly minimum: number; readonly weight: number };

export type SpriteCardSampling = "stretch" | "tile" | "crop";

export type SpriteCardSegment = {
  readonly id: string;
  readonly regionId: string;
  readonly sourceRect: SpriteCardSourceRect;
  readonly allocation: SpriteCardAllocation;
  readonly sampling: SpriteCardSampling;
};

export type SpriteCardPlacement = {
  readonly segmentId: string;
  readonly offset: number;
  readonly length: number;
};

export type SpriteEdgeResolution = {
  readonly extent: number;
  readonly minimumDemand: number;
  readonly usedLength: number;
  readonly unusedLength: number;
  readonly deficitLength: number;
  readonly status: "exact" | "surplusDistributed" | "surplusUnused" | "underflow" | "rejected";
  readonly placements: readonly SpriteCardPlacement[];
  readonly diagnostics: readonly string[];
};

export type SpriteEdgeProgram = {
  readonly id: string;
  readonly atlasImageUrl: string;
  readonly atlasWidth: number;
  readonly atlasHeight: number;
  readonly segments: readonly SpriteCardSegment[];
};

export type ResolvedSpriteCard = SpriteCardSegment & SpriteCardPlacement;

export type SpriteEdgeCardProjection = {
  readonly programId: string;
  readonly atlasImageUrl: string;
  readonly atlasWidth: number;
  readonly atlasHeight: number;
  readonly resolution: SpriteEdgeResolution;
  readonly cards: readonly ResolvedSpriteCard[];
};

/**
 * Joins authored segment metadata to compiler/allocator-owned placements.
 * This read-only projection never resolves allocation and never becomes asset authority.
 */
export function projectSpriteEdgeCards(
  program: SpriteEdgeProgram,
  resolution: SpriteEdgeResolution,
): SpriteEdgeCardProjection {
  if (program.id.trim().length === 0) throw new Error("Sprite edge program id must be non-empty.");
  if (program.atlasWidth <= 0 || program.atlasHeight <= 0) {
    throw new Error("Sprite Card atlas dimensions must be positive.");
  }

  const placements = new Map(
    resolution.placements.map((placement) => [placement.segmentId, placement]),
  );
  const cards = program.segments.map((segment) => {
    const placement = placements.get(segment.id);
    if (!placement) throw new Error(`Resolved placement for segment "${segment.id}" is missing.`);
    return Object.freeze({ ...segment, ...placement });
  });
  if (placements.size !== cards.length) {
    throw new Error("Resolved placements contain unknown or duplicate segment identities.");
  }

  let nextOffset = 0;
  for (const card of cards) {
    if (card.offset !== nextOffset) {
      throw new Error(
        `Resolved segment "${card.id}" introduces a gap or overlap at ${nextOffset}.`,
      );
    }
    if (card.length < 0) throw new Error(`Resolved segment "${card.id}" has negative length.`);
    nextOffset += card.length;
  }
  if (nextOffset !== resolution.usedLength) {
    throw new Error("Resolved card lengths do not equal the reported used length.");
  }

  return Object.freeze({
    programId: program.id,
    atlasImageUrl: program.atlasImageUrl,
    atlasWidth: program.atlasWidth,
    atlasHeight: program.atlasHeight,
    resolution,
    cards: Object.freeze(cards),
  });
}
