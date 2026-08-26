/**
 * Compact "how it's built" panel for each demo page. Label/value rows rather than
 * prose - someone scanning for the stack wants to find it in two seconds, and a
 * paragraph makes them read to find out there was nothing interesting in it.
 */
type Row = { k: string; v: React.ReactNode };

export default function TechBox({ rows, note }: { rows: Row[]; note?: string }) {
  return (
    <section className="mt-14 rounded-lg border border-line bg-panel p-6">
      <h2 className="stat-lbl">How it&rsquo;s built</h2>
      <dl className="mt-4 grid gap-x-8 gap-y-3 sm:grid-cols-2">
        {rows.map((r) => (
          <div key={r.k} className="border-t border-line pt-3">
            <dt className="text-[11px] font-bold uppercase tracking-[0.1em] text-steelDim">{r.k}</dt>
            <dd className="mt-1 text-[14px] leading-snug text-muted">{r.v}</dd>
          </div>
        ))}
      </dl>
      {note && <p className="mt-4 border-t border-line pt-3 text-[13px] leading-relaxed text-muted">{note}</p>}
    </section>
  );
}

/** Inline code, styled once so the boxes stay consistent. */
export const C = ({ children }: { children: React.ReactNode }) => (
  <code className="rounded bg-ink px-[3px] py-0.5 font-mono text-[12px] text-bright">{children}</code>
);
