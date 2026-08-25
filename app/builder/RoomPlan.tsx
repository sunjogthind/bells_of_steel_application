'use client';

import { BARBELL_LENGTH_IN, type Verdict } from '@/lib/fit';

type Props = {
  roomW: number; roomD: number; ceiling: number;
  rackW: number | null; rackD: number | null; rackH: number | null;
  usesBarbell: boolean; verdict: Verdict;
};

const STROKE: Record<Verdict, string> = {
  fits: '#4ade80', tight: '#fbbf24', no: '#f87171', unknown: '#8b8b96',
};

/** Top-down plan and side elevation, both drawn to the same inch scale. */
export default function RoomPlan(p: Props) {
  const pad = 34;
  const planW = 420, planH = 300;
  const scale = Math.min((planW - pad * 2) / p.roomW, (planH - pad * 2) / p.roomD);
  const rw = p.roomW * scale, rd = p.roomD * scale;
  const ox = (planW - rw) / 2, oy = (planH - rd) / 2;
  const colour = STROKE[p.verdict];

  const hasPlan = p.rackW != null && p.rackD != null;
  const aw = (p.rackW ?? 0) * scale, ad = (p.rackD ?? 0) * scale;
  const ax = ox + (rw - aw) / 2, ay = oy + 8;

  const elW = 300, elH = 300;
  const eScale = Math.min((elW - pad * 2) / p.roomW, (elH - pad * 2) / p.ceiling);
  const ew = p.roomW * eScale, eh = p.ceiling * eScale;
  const ex = (elW - ew) / 2, ey = elH - pad - eh;
  const rackEh = (p.rackH ?? 0) * eScale;
  const rackEw = (p.rackW ?? 24) * eScale;

  return (
    <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
      <figure className="rounded-lg border border-line bg-ink/60 p-3">
        <figcaption className="mb-2 font-mono text-[10px] uppercase tracking-wider text-muted">
          Plan view · {(p.roomW / 12).toFixed(1)}ft × {(p.roomD / 12).toFixed(1)}ft
        </figcaption>
        <svg viewBox={`0 0 ${planW} ${planH}`} className="w-full" role="img"
             aria-label={`Top-down plan of a ${p.roomW} by ${p.roomD} inch room with the rack footprint drawn to scale`}>
          <defs>
            <pattern id="hatch" width="6" height="6" patternTransform="rotate(45)" patternUnits="userSpaceOnUse">
              <line x1="0" y1="0" x2="0" y2="6" stroke="#26262b" strokeWidth="3" />
            </pattern>
          </defs>
          <rect x={ox} y={oy} width={rw} height={rd} fill="url(#hatch)" opacity="0.55" />
          <rect x={ox} y={oy} width={rw} height={rd} fill="none" stroke="#3c3c45" strokeWidth="1.5" />

          {hasPlan && (
            <>
              <rect x={ax} y={ay} width={aw} height={ad} fill={colour} fillOpacity="0.16" stroke={colour} strokeWidth="1.75" />
              <text x={ax + aw / 2} y={ay + ad / 2} textAnchor="middle" dominantBaseline="middle"
                    className="font-mono" fontSize="9" fill={colour}>
                {p.rackW}&Prime; &times; {p.rackD}&Prime;
              </text>
            </>
          )}

          {p.usesBarbell && (
            <g>
              <line x1={ox + (rw - BARBELL_LENGTH_IN * scale) / 2} y1={oy + rd - 30}
                    x2={ox + (rw + BARBELL_LENGTH_IN * scale) / 2} y2={oy + rd - 30}
                    stroke="#d64000" strokeWidth="3" strokeLinecap="round" />
              <text x={planW / 2} y={oy + rd - 15} textAnchor="middle" className="font-mono" fontSize="9" fill="#d64000">
                7ft bar · {BARBELL_LENGTH_IN}&Prime;
              </text>
            </g>
          )}

          <text x={planW / 2} y={oy - 10} textAnchor="middle" className="font-mono" fontSize="9" fill="#8b8b96">
            {p.roomW}&Prime; wide
          </text>
          <text x={ox - 12} y={oy + rd / 2} textAnchor="middle" className="font-mono" fontSize="9" fill="#8b8b96"
                transform={`rotate(-90 ${ox - 12} ${oy + rd / 2})`}>
            {p.roomD}&Prime; deep
          </text>
        </svg>
      </figure>

      <figure className="rounded-lg border border-line bg-ink/60 p-3">
        <figcaption className="mb-2 font-mono text-[10px] uppercase tracking-wider text-muted">
          Elevation · {Math.floor(p.ceiling / 12)}ft {p.ceiling % 12}in ceiling
        </figcaption>
        <svg viewBox={`0 0 ${elW} ${elH}`} className="w-full" role="img"
             aria-label={`Side elevation comparing the rack height to a ${p.ceiling} inch ceiling`}>
          <line x1={ex - 10} y1={ey} x2={ex + ew + 10} y2={ey} stroke="#3c3c45" strokeWidth="2" />
          <line x1={ex - 10} y1={elH - pad} x2={ex + ew + 10} y2={elH - pad} stroke="#3c3c45" strokeWidth="2" />
          <text x={ex + ew + 14} y={ey + 4} className="font-mono" fontSize="9" fill="#8b8b96">ceiling</text>

          {p.rackH != null ? (
            <>
              <rect x={ex + (ew - rackEw) / 2} y={elH - pad - rackEh} width={rackEw} height={rackEh}
                    fill={colour} fillOpacity="0.16" stroke={colour} strokeWidth="1.75" />
              <text x={ex + ew / 2} y={elH - pad - rackEh / 2} textAnchor="middle" dominantBaseline="middle"
                    className="font-mono" fontSize="9" fill={colour}>{p.rackH}&Prime;</text>
              <line x1={ex + ew / 2} y1={ey} x2={ex + ew / 2} y2={elH - pad - rackEh}
                    stroke={colour} strokeWidth="1" strokeDasharray="3 3" />
              <text x={ex + ew / 2 + 6} y={Math.min(ey, elH - pad - rackEh) + Math.abs(elH - pad - rackEh - ey) / 2}
                    className="font-mono" fontSize="9" fill={colour}>
                {p.ceiling - p.rackH > 0
                  ? `${p.ceiling - p.rackH}\u2033 clear`
                  : p.ceiling === p.rackH
                  ? 'flush with ceiling'
                  : `${p.rackH - p.ceiling}\u2033 too tall`}
              </text>
            </>
          ) : (
            <text x={elW / 2} y={elH / 2} textAnchor="middle" className="font-mono" fontSize="10" fill="#8b8b96">
              height not published
            </text>
          )}
        </svg>
      </figure>
    </div>
  );
}
