// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import {
  projectSpriteEdgeCards,
  type SpriteEdgeProgram,
  type SpriteEdgeResolution,
} from "../src/modules/spriteCards/model";
import { SpriteCardStrip } from "../src/modules/spriteCards/ui/SpriteCardStrip";

const program: SpriteEdgeProgram = {
  id: "dialogue.top",
  atlasImageUrl: "sunkill-ui-atlas.png",
  atlasWidth: 1536,
  atlasHeight: 1024,
  segments: [
    {
      id: "cap-left",
      regionId: "dialogue.top.cap-left",
      sourceRect: { x: 102, y: 34, width: 84, height: 76 },
      allocation: { kind: "fixed", length: 42 },
      sampling: "crop",
    },
    {
      id: "glow",
      regionId: "dialogue.top.glow",
      sourceRect: { x: 294, y: 34, width: 82, height: 76 },
      allocation: { kind: "flex", minimum: 30, weight: 1 },
      sampling: "stretch",
    },
    {
      id: "center",
      regionId: "dialogue.top.center",
      sourceRect: { x: 400, y: 34, width: 224, height: 76 },
      allocation: { kind: "flex", minimum: 30, weight: 2 },
      sampling: "stretch",
    },
  ],
};

const resolution: SpriteEdgeResolution = {
  extent: 132,
  minimumDemand: 102,
  usedLength: 132,
  unusedLength: 0,
  deficitLength: 0,
  status: "surplusDistributed",
  placements: [
    { segmentId: "cap-left", offset: 0, length: 42 },
    { segmentId: "glow", offset: 42, length: 40 },
    { segmentId: "center", offset: 82, length: 50 },
  ],
  diagnostics: [],
};

describe("Sprite Cards", () => {
  it("projects semantic asset state and allocator output without becoming authority", () => {
    const projection = projectSpriteEdgeCards(program, resolution);

    expect(projection.cards.map((card) => [card.id, card.offset, card.length])).toEqual([
      ["cap-left", 0, 42],
      ["glow", 42, 40],
      ["center", 82, 50],
    ]);
    render(<SpriteCardStrip projection={projection} />);
    expect(screen.getByText(/extent 132/).textContent).toContain("minimum 102");
    expect(screen.getByLabelText("Sprite Card glow").textContent).toContain("Flex min 30 weight 1");
    expect(screen.getByLabelText("Sprite Card glow").textContent).toContain("Sampling stretch");
    expect(screen.getByLabelText("Sprite Card glow").textContent).toContain("Resolved 42+40");
    expect(screen.getByText(/edit and recompile/)).toBeTruthy();
  });

  it("rejects gaps, overlaps, missing placements, and negative lengths", () => {
    expect(() =>
      projectSpriteEdgeCards(program, {
        ...resolution,
        placements: resolution.placements.map((placement, index) =>
          index === 1 ? { ...placement, offset: 43 } : placement,
        ),
      }),
    ).toThrow(/gap or overlap/);
    expect(() =>
      projectSpriteEdgeCards(program, {
        ...resolution,
        placements: resolution.placements.slice(0, 2),
      }),
    ).toThrow(/is missing/);
    expect(() =>
      projectSpriteEdgeCards(program, {
        ...resolution,
        placements: resolution.placements.map((placement, index) =>
          index === 1 ? { ...placement, length: -1 } : placement,
        ),
      }),
    ).toThrow(/negative length/);
  });
});
