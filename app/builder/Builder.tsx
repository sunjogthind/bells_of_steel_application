'use client';

import { useMemo, useState } from 'react';
import { checkFit, type Room, type Verdict, type Check } from '@/lib/fit';
import type { RackPayload, Slim } from '@/lib/builder-data';
import RoomPlan from './RoomPlan';

const money = (c: number | null) =>
  c == null ? '—' : `$${(c / 100).toLocaleString('en-CA', { maximumFractionDigits: 0 })}`;

const VERDICT_UI: Record<Verdict, { label: string; cls: string; dot: string }> = {
  fits:    { label: 'Fits',          cls: 'text-emerald-700 border-emerald-600/30 bg-emerald-50', dot: 'bg-emerald-600' },
  tight:   { label: 'Tight',         cls: 'text-amber-700 border-amber-500/40 bg-amber-50',       dot: 'bg-amber-500' },
  no:      { label: "Won't fit",     cls: 'text-red-600 border-red-500/35 bg-red-50',             dot: 'bg-red-500' },
  unknown: { label: 'Can’t verify', cls: 'text-muted border-line bg-panel',                      dot: 'bg-muted' },
};

const PRESETS = [
  { name: 'Low basement', ceiling: 84, w: 120, d: 108 },
  { name: 'Standard basement', ceiling: 90, w: 144, d: 120 },
  { name: 'Single garage', ceiling: 96, w: 132, d: 216 },
  { name: 'Double garage', ceiling: 108, w: 216, d: 240 },
];

const SOURCE_BADGE: Record<string, { t: string; cls: string }> = {
  copy:      { t: 'from product page', cls: 'text-emerald-700/80' },
  estimated: { t: 'our estimate',      cls: 'text-amber-700' },
  unknown:   { t: 'not published',     cls: 'text-red-600/80' },
};

export default function Builder({
  racks, kit, lookup,
}: { racks: RackPayload[]; kit: { group: string; items: Slim[] }[]; lookup: Record<number, Slim> }) {
  const [ceiling, setCeiling] = useState(90);
  const [w, setW] = useState(144);
  const [d, setD] = useState(120);
  const [usesBarbell, setUsesBarbell] = useState(true);
  const [budget, setBudget] = useState(3500);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [cart, setCart] = useState<number[]>([]);

  const room: Room = { ceilingIn: ceiling, widthIn: w, depthIn: d, usesBarbell };

  const evaluated = useMemo(() => {
    const rank: Record<Verdict, number> = { fits: 0, tight: 1, unknown: 2, no: 3 };
    return racks
      .map((r) => ({ rack: r, ...checkFit(r, room) }))
      .sort((a, b) => rank[a.verdict] - rank[b.verdict] || (a.rack.priceCents ?? 0) - (b.rack.priceCents ?? 0));
  }, [racks, ceiling, w, d, usesBarbell]);

  const counts = useMemo(() => {
    const c: Record<Verdict, number> = { fits: 0, tight: 0, no: 0, unknown: 0 };
    evaluated.forEach((e) => c[e.verdict]++);
    return c;
  }, [evaluated]);

  /** Explain what the current room is actually doing to the catalog. */
  const insights = useMemo(() => {
    const out: string[] = [];
    const blocked = evaluated.filter((e) => e.verdict === 'no');

    const byCeiling = blocked.filter((e) => e.checks.some((c) => c.label === 'Ceiling clearance' && c.verdict === 'no'));
    if (byCeiling.length) {
      // Group by upright height so the reason is a fact, not a vibe.
      const groups = new Map<number, string[]>();
      byCeiling.forEach((e) => {
        const h = e.rack.height.value;
        if (h == null) return;
        groups.set(h, [...(groups.get(h) ?? []), e.rack.family]);
      });
      const parts = Array.from(groups.entries())
        .sort((a, b) => b[0] - a[0])
        .map(([h, fams]) => {
          const uniq = Array.from(new Set(fams));
          return `${fams.length} rack${fams.length > 1 ? 's' : ''} with ${h}\u2033 uprights (${uniq.join(', ')}) need ${h + 2}\u2033`;
        });
      out.push(`Your ${Math.floor(ceiling / 12)}'${ceiling % 12}\u2033 ceiling rules out ${byCeiling.length} of ${evaluated.length} racks: ${parts.join('; ')}.`);
    }

    const byWidth = blocked.filter((e) => e.checks.some((c) => c.label === 'Floor width' && c.verdict === 'no'));
    if (byWidth.length) out.push(`${byWidth.length} rack${byWidth.length > 1 ? "s don't" : " doesn't"} fit across ${(w / 12).toFixed(1)}ft of wall.`);

    const unverified = evaluated.filter((e) => e.verdict === 'unknown');
    if (unverified.length) {
      out.push(`${unverified.length} rack${unverified.length > 1 ? 's' : ''} can't be checked at all — Bells of Steel publishes no dimensions for them. All of the Residential line is in this bucket.`);
    }

    if (usesBarbell && w < 92) out.push(`At ${(w / 12).toFixed(1)}ft wide, a 7ft barbell will be a squeeze regardless of which rack you pick.`);
    return out;
  }, [evaluated, ceiling, w, usesBarbell]);

  const selected = evaluated.find((e) => e.rack.id === selectedId) ?? null;
  const cartTotal = cart.reduce((s, id) => s + (lookup[id]?.priceCents ?? 0), 0)
    + (selected?.rack.priceCents ?? 0);
  const overBudget = cartTotal > budget * 100;

  const toggle = (id: number) => setCart((c) => (c.includes(id) ? c.filter((x) => x !== id) : [...c, id]));

  return (
    <div className="mx-auto max-w-6xl px-5 pb-24 pt-10">
      {/* ---------- inputs ---------- */}
      <div className="rounded-lg border border-line bg-panel p-5">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-mono text-[10px] uppercase tracking-wider text-muted">Presets</span>
          {PRESETS.map((p) => (
            <button
              key={p.name}
              onClick={() => { setCeiling(p.ceiling); setW(p.w); setD(p.d); }}
              className={`rounded border px-2.5 py-1 text-xs transition-colors ${
                ceiling === p.ceiling && w === p.w && d === p.d
                  ? 'border-steel bg-steelSoft text-steel'
                  : 'border-line text-muted hover:border-muted hover:text-bright'
              }`}
            >
              {p.name}
            </button>
          ))}
        </div>

        <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          <Slider label="Ceiling height" value={ceiling} min={78} max={132} onChange={setCeiling} />
          <Slider label="Room width" value={w} min={72} max={288} onChange={setW} />
          <Slider label="Room depth" value={d} min={72} max={288} onChange={setD} />
          <div>
            <div className="flex items-baseline justify-between">
              <label className="text-xs text-muted">Budget</label>
              <span className="font-mono text-sm tabular-nums text-bright">${budget.toLocaleString()}</span>
            </div>
            <input type="range" min={500} max={12000} step={100} value={budget}
                   onChange={(e) => setBudget(+e.target.value)}
                   className="mt-2 w-full accent-steel" />
            <label className="mt-3 flex cursor-pointer items-center gap-2 text-xs text-muted">
              <input type="checkbox" checked={usesBarbell} onChange={(e) => setUsesBarbell(e.target.checked)}
                     className="accent-steel" />
              I&rsquo;ll use a 7ft barbell
            </label>
          </div>
        </div>

        <div className="mt-5 flex flex-wrap gap-4 border-t border-line pt-4 font-mono text-xs">
          {(['fits', 'tight', 'unknown', 'no'] as Verdict[]).map((v) => (
            <span key={v} className="flex items-center gap-1.5 text-muted">
              <span className={`h-1.5 w-1.5 rounded-full ${VERDICT_UI[v].dot}`} />
              {counts[v]} {VERDICT_UI[v].label.toLowerCase()}
            </span>
          ))}
          <span className="ml-auto text-muted">of {racks.length} rack models</span>
        </div>

        {insights.length > 0 && (
          <ul className="mt-4 space-y-1.5 border-t border-line pt-4">
            {insights.map((t) => (
              <li key={t} className="flex gap-2 text-xs leading-relaxed text-muted">
                <span className="mt-[3px] text-steel">&rsaquo;</span>
                <span>{t}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* ---------- results ---------- */}
      <div className="mt-6 grid gap-6 lg:grid-cols-[340px_1fr]">
        <div className="space-y-2">
          {evaluated.map(({ rack, verdict }) => {
            const ui = VERDICT_UI[verdict];
            const active = rack.id === selectedId;
            return (
              <button
                key={rack.id}
                onClick={() => setSelectedId(active ? null : rack.id)}
                aria-label={`${rack.title} — ${ui.label}`}
                className={`w-full rounded-lg border p-3 text-left transition-colors ${
                  active ? 'border-steel bg-steelSoft' : 'border-line bg-panel hover:border-muted'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{rack.title.replace(/\s*\(.*\)$/, '')}</p>
                    <p className="mt-0.5 font-mono text-[10px] text-muted">
                      {rack.family} · {rack.frameLabel}{rack.holePattern ? ` · ${rack.holePattern} holes` : ''}
                    </p>
                  </div>
                  <span className={`shrink-0 rounded border px-1.5 py-0.5 font-mono text-[10px] ${ui.cls}`}>
                    {ui.label}
                  </span>
                </div>
                <p className="mt-2 font-mono text-sm tabular-nums text-bright">{money(rack.priceCents)}</p>
              </button>
            );
          })}
        </div>

        <div>
          {!selected ? (
            <div className="grid h-64 place-items-center rounded-lg border border-dashed border-line text-sm text-muted">
              Select a rack to see the fit breakdown
            </div>
          ) : (
            <RackDetail
              e={selected} room={room} lookup={lookup} kit={kit}
              cart={cart} toggle={toggle} cartTotal={cartTotal} budget={budget} overBudget={overBudget}
            />
          )}
        </div>
      </div>
    </div>
  );
}

function Slider({ label, value, min, max, onChange }: {
  label: string; value: number; min: number; max: number; onChange: (n: number) => void;
}) {
  const ft = Math.floor(value / 12), inch = value % 12;
  return (
    <div>
      <div className="flex items-baseline justify-between">
        <label className="text-xs text-muted">{label}</label>
        <span className="font-mono text-sm tabular-nums text-bright">{ft}&rsquo;{inch}&Prime;</span>
      </div>
      <input type="range" min={min} max={max} value={value}
             onChange={(e) => onChange(+e.target.value)}
             className="mt-2 w-full accent-steel" />
    </div>
  );
}

function RackDetail({ e, room, lookup, kit, cart, toggle, cartTotal, budget, overBudget }: {
  e: { rack: RackPayload; checks: Check[]; verdict: Verdict };
  room: Room; lookup: Record<number, Slim>; kit: { group: string; items: Slim[] }[];
  cart: number[]; toggle: (id: number) => void; cartTotal: number; budget: number; overBudget: boolean;
}) {
  const { rack, checks, verdict } = e;
  const att = Object.values(rack.attachments).flat()
    .map((id) => lookup[id]).filter(Boolean);

  return (
    <div className="space-y-5">
      <div className="rounded-lg border border-line bg-panel p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold tracking-tight">{rack.title}</h2>
            <p className="mt-1 font-mono text-xs text-muted">
              {rack.family} · {rack.tubing ?? 'tubing n/a'} · {rack.holePattern ?? 'hole size n/a'}
            </p>
          </div>
          <a href={rack.url} target="_blank" rel="noopener noreferrer"
             className="rounded border border-line px-3 py-1.5 text-xs text-muted transition-colors hover:border-muted hover:text-bright">
            View on bellsofsteel.com ↗
          </a>
        </div>

        <RoomPlanWrap rack={rack} room={room} verdict={verdict} />

        <ul className="mt-5 space-y-2">
          {checks.map((c) => {
            const ui = VERDICT_UI[c.verdict];
            const sb = SOURCE_BADGE[c.source];
            return (
              <li key={c.label} className="rounded border border-line bg-ink p-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${ui.dot}`} />
                  <span className="text-sm font-medium">{c.label}</span>
                  <span className={`font-mono text-[10px] ${sb.cls}`}>({sb.t})</span>
                  <span className="ml-auto font-mono text-xs tabular-nums text-muted">
                    need {c.need} · have {c.have}
                  </span>
                </div>
                <p className="mt-1.5 text-xs leading-relaxed text-muted">{c.detail}</p>
              </li>
            );
          })}
        </ul>
      </div>

      <div className="rounded-lg border border-line bg-panel p-5">
        <div className="flex items-baseline justify-between">
          <h3 className="text-sm font-semibold">
            Bolt-on attachments <span className="font-mono text-xs font-normal text-muted">({att.length})</span>
          </h3>
          <p className="font-mono text-[10px] text-muted">
            from their <code className="text-steel">hgb_</code> compatibility tags
          </p>
        </div>
        {att.length === 0 ? (
          <p className="mt-3 rounded border border-amber-500/35 bg-amber-50 p-3 text-xs leading-relaxed text-amber-900">
            Bells of Steel publishes no attachment compatibility tags for this rack, so this tool will not
            claim anything bolts onto it. For the Residential line specifically, that mapping does not exist
            in the catalog feed at all.
          </p>
        ) : (
          <div className="mt-3 grid gap-1.5 sm:grid-cols-2">
            {att.map((a) => (
              <label key={a.id}
                     className="flex cursor-pointer items-center gap-2.5 rounded border border-line bg-ink p-2.5 transition-colors hover:border-muted">
                <input type="checkbox" checked={cart.includes(a.id)} onChange={() => toggle(a.id)} className="accent-steel" />
                <span className="min-w-0 flex-1 truncate text-xs">{a.title}</span>
                <span className="shrink-0 font-mono text-xs tabular-nums text-muted">{money(a.priceCents)}</span>
              </label>
            ))}
          </div>
        )}
      </div>

      <div className="rounded-lg border border-line bg-panel p-5">
        <h3 className="text-sm font-semibold">Complete the gym</h3>
        <p className="mt-1 text-xs text-muted">
          Grouped using the same categories Bells of Steel curates in their own tags.
        </p>
        <div className="mt-4 space-y-4">
          {kit.map((g) => (
            <div key={g.group}>
              <p className="font-mono text-[10px] uppercase tracking-wider text-muted">{g.group}</p>
              <div className="mt-1.5 grid gap-1.5 sm:grid-cols-2">
                {g.items.slice(0, 4).map((i) => (
                  <label key={i.id}
                         className="flex cursor-pointer items-center gap-2.5 rounded border border-line bg-ink p-2.5 transition-colors hover:border-muted">
                    <input type="checkbox" checked={cart.includes(i.id)} onChange={() => toggle(i.id)} className="accent-steel" />
                    <span className="min-w-0 flex-1 truncate text-xs">{i.title}</span>
                    <span className="shrink-0 font-mono text-xs tabular-nums text-muted">{money(i.priceCents)}</span>
                  </label>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className={`sticky bottom-4 rounded-lg border p-4 backdrop-blur ${
        overBudget ? 'border-red-500/40 bg-red-50' : 'border-steel/40 bg-steelSoft'
      }`}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-wider text-muted">
              Build total · {cart.length + 1} items
            </p>
            <p className="font-mono text-2xl font-semibold tabular-nums">{money(cartTotal)}</p>
          </div>
          <p className={`font-mono text-xs ${overBudget ? 'text-red-600' : 'text-emerald-700'}`}>
            {overBudget
              ? `${money(cartTotal - budget * 100)} over your $${budget.toLocaleString()} budget`
              : `${money(budget * 100 - cartTotal)} left of $${budget.toLocaleString()}`}
          </p>
        </div>
      </div>
    </div>
  );
}

function RoomPlanWrap({ rack, room, verdict }: { rack: RackPayload; room: Room; verdict: Verdict }) {
  return (
    <div className="mt-5">
      <RoomPlan
        roomW={room.widthIn} roomD={room.depthIn} ceiling={room.ceilingIn}
        rackW={rack.width.value} rackD={rack.depth.value} rackH={rack.height.value}
        usesBarbell={room.usesBarbell} verdict={verdict}
      />
    </div>
  );
}
