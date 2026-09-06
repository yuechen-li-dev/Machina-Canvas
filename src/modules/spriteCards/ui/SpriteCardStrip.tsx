import type { CSSProperties } from "react";
import type { ResolvedSpriteCard, SpriteEdgeCardProjection } from "../model";

export function SpriteCardStrip({ projection }: { projection: SpriteEdgeCardProjection }) {
  const { resolution } = projection;
  return (
    <section
      aria-label={`Sprite edge program ${projection.programId}`}
      className="sprite-card-strip"
    >
      <header>
        <strong>{projection.programId}</strong>
        <span>
          extent {resolution.extent} · minimum {resolution.minimumDemand} · used{" "}
          {resolution.usedLength} · unused {resolution.unusedLength} · deficit{" "}
          {resolution.deficitLength} · {resolution.status}
        </span>
      </header>
      <fieldset aria-label="Resolved allocation strip" className="sprite-card-allocation-strip">
        {projection.cards.map((card) => (
          <span
            key={card.id}
            style={{ flexBasis: `${Math.max(0, card.length)}px`, flexGrow: 0 }}
            title={`${card.id}: ${card.offset}+${card.length}`}
          />
        ))}
      </fieldset>
      <div className="sprite-card-sequence">
        {projection.cards.map((card) => (
          <SpriteCard card={card} key={card.id} projection={projection} />
        ))}
      </div>
      {resolution.diagnostics.length > 0 ? (
        <ul aria-label="Allocation diagnostics">
          {resolution.diagnostics.map((diagnostic) => (
            <li key={diagnostic}>{diagnostic}</li>
          ))}
        </ul>
      ) : null}
      <small>Read-only projection; edit and recompile the authoritative *.obj.ts source.</small>
    </section>
  );
}

function SpriteCard({
  card,
  projection,
}: {
  card: ResolvedSpriteCard;
  projection: SpriteEdgeCardProjection;
}) {
  const previewStyle: CSSProperties = {
    backgroundImage: `url(${projection.atlasImageUrl})`,
    backgroundPosition: `-${card.sourceRect.x}px -${card.sourceRect.y}px`,
    backgroundSize: `${projection.atlasWidth}px ${projection.atlasHeight}px`,
    width: card.sourceRect.width,
    height: card.sourceRect.height,
  };
  const allocation =
    card.allocation.kind === "fixed"
      ? `Fixed ${card.allocation.length}`
      : `Flex min ${card.allocation.minimum} weight ${card.allocation.weight}`;
  return (
    <article aria-label={`Sprite Card ${card.id}`} className="sprite-card">
      <div aria-label={`Region preview ${card.regionId}`} role="img" style={previewStyle} />
      <strong>{card.id}</strong>
      <span>{card.regionId}</span>
      <span>
        source {card.sourceRect.x},{card.sourceRect.y} {card.sourceRect.width}×
        {card.sourceRect.height}
      </span>
      <span>{allocation}</span>
      <span>Sampling {card.sampling}</span>
      <span>
        Resolved {card.offset}+{card.length}
      </span>
    </article>
  );
}
