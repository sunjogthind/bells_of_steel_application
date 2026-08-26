/**
 * "Why it's useful" — sits high on each demo page, above the tool itself.
 *
 * Deliberately three points and no more. This is for someone deciding whether
 * to keep reading, not someone evaluating the work; the detail lives further
 * down. Each point leads with the claim and then earns it in one clause.
 */
type Point = { lead: string; body: React.ReactNode };

export default function Impact({ points, caveat }: { points: Point[]; caveat?: string }) {
  return (
    <section className="mt-8 rounded-lg border border-steel/25 bg-steelSoft p-6">
      <h2 className="stat-lbl text-steelDim">Why it&rsquo;s useful</h2>
      <ul className="mt-4 space-y-3">
        {points.map((p) => (
          <li key={p.lead} className="flex gap-3">
            <span className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-steel" />
            <p className="text-[15px] leading-relaxed text-dim">
              <span className="font-bold text-bright">{p.lead}</span> {p.body}
            </p>
          </li>
        ))}
      </ul>
      {caveat && (
        <p className="mt-4 border-t border-steel/20 pt-3 text-[13px] leading-relaxed text-muted">
          <span className="font-semibold">Where it stops:</span> {caveat}
        </p>
      )}
    </section>
  );
}
