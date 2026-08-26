import spotter from '@/data/spotter.json';
import Impact from '@/components/Impact';
import TechBox, { C } from '@/components/TechBox';
import { IconSpotter } from '@/components/Icons';
import Spotter from './Spotter';
import type { SpotterIndex } from '@/lib/spotter-types';

export const metadata = { title: 'Spotter — Rana Thind × Bells of Steel' };

export default function Page() {
  const ix = spotter as unknown as SpotterIndex;
  const s = ix.stats;

  return (
    <div className="gridbg">
      <div className="mx-auto max-w-[1180px] px-6 py-12">
        <div className="flex items-center gap-3">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-lg border border-steel/25 bg-steelSoft text-steelDim">
            <IconSpotter className="h-6 w-6" />
          </span>
          <p className="eyebrow text-steelDim">Demo 05 · Product concept · Retrieval-augmented generation</p>
        </div>
        <h1 className="mt-4 text-[clamp(32px,4.5vw,52px)] font-extrabold">Spotter</h1>
        <p className="mt-4 max-w-3xl text-lg leading-relaxed text-muted">
          A coach that reads a new member&rsquo;s signup profile in plain language, writes a program around
          the equipment they already own, and changes it while they talk to it.
        </p>

        <div className="mt-6 grid gap-4 lg:grid-cols-3">
          <div className="rounded-lg border border-line bg-panel p-5">
            <p className="stat-lbl">The pitch</p>
            <p className="mt-2 text-[15px] leading-relaxed text-muted">
              Your training app already has a <span className="font-semibold text-bright">Program Quiz</span>{' '}
              that recommends a program from a fixed set of answers. Spotter is that widget after it learns
              to listen — and after it knows what is in the member&rsquo;s garage.
            </p>
          </div>
          <div className="rounded-lg border border-line bg-panel p-5">
            <p className="stat-lbl">Why it is defensible</p>
            <p className="mt-2 text-[15px] leading-relaxed text-muted">
              You sell the rack <span className="font-semibold text-bright">and</span> the programming. A
              generic fitness bot cannot write around a member&rsquo;s exact kit, and cannot tell them which
              single purchase unlocks the pattern they are missing. This can, from your live catalogue.
            </p>
          </div>
          <div className="rounded-lg border border-line bg-panel p-5">
            <p className="stat-lbl">Three surfaces, one engine</p>
            <p className="mt-2 text-[15px] leading-relaxed text-muted">
              In your app after signup. On your website before purchase, where the same engine answers
              &ldquo;what do I actually need?&rdquo;. And internally, drafting programs for your coaches to
              approve — which is where it saves the most hours.
            </p>
          </div>
        </div>

        {/* provenance — the thing that has to be said plainly */}
        <div className="mt-4 rounded-lg border border-amber-500/35 bg-amber-50 p-5">
          <p className="text-[13px] font-bold uppercase tracking-wider text-amber-900">What is real, and what is mine</p>
          <p className="mt-2 max-w-4xl text-[15px] leading-relaxed text-amber-900">
            The <span className="font-bold">equipment is real</span> — {s.products} live products from your
            storefront, at prices you actually charge.
          </p>
          <p className="mt-2 max-w-4xl text-[15px] leading-relaxed text-amber-900">
            The <span className="font-bold">{s.exercises} exercises and {s.knowledge} coaching notes are mine</span>,
            written for this demo. Your programming is not public, so I did not guess at it. Pointed at your
            real library, that is a data change, not a code change.
          </p>
        <Impact
          points={[
            { lead: 'It turns a signup into a reason to come back.', body: <>A new member currently gets a program from a fixed quiz. This gives them one built around the equipment they actually own, which is the difference between a plan they follow and one they abandon.</> },
            { lead: 'The equipment gap is the recommendation.', body: <>When a movement pattern has nothing to train it with, that is both a coaching answer and a product answer — grounded in a real item at a real price rather than an ad.</> },
            { lead: 'It drafts, your coaches approve.', body: <>Used internally it is a first draft for a human to correct, which is where the hours actually are.</> },
          ]}
          caveat="It refuses to write a program around pain or an injury, and hands that to a human. Which substitutions are safe depends on a diagnosis."
        />
        </div>

        <div className="mt-10">
          <Spotter ix={ix} />
        </div>

        {/* architecture */}
        <h2 className="mt-16 text-2xl font-extrabold">How the retrieval works</h2>
        <p className="mt-3 max-w-3xl leading-relaxed text-muted">
          {s.docs} documents in one index — exercises, coaching notes and your real products — with{' '}
          {s.terms} terms. Every answer above is grounded in a retrieved document, and the trace panel shows
          which ones and why.
        </p>

        <div className="mt-5 grid gap-4 md:grid-cols-2">
          {[
            ['1 · Slot extraction', 'Free text becomes a structured profile: experience, goal, days, equipment, constraints. Anything not confidently extracted stays null and gets asked about — a wrong slot produces a confidently wrong program.'],
            ['2 · Hybrid retrieval', 'BM25 over the corpus (k1 1.5, b 0.75, precomputed IDF) plus a concept-expansion pass mapping everyday words onto corpus vocabulary. Expansion terms score at a 0.35 discount — they were inferred, not said.'],
            ['3 · Structured rerank', 'Candidates are reweighted by what the member owns and what suits their experience. This is where a general fitness bot cannot follow — it does not know their gym. Accuracy here is capped by your product_type field, which the Catalogue Audit measures.'],
            ['4 · Constrained synthesis', 'The program is assembled deterministically against a split template. A pattern with no available exercise becomes an explicit gap, resolved to the cheapest product in your catalogue that closes it.'],
            ['5 · Generation, then verification', 'Claude Opus 5 rewrites the retrieved facts as prose, then the output is checked back against them. Any price or rep scheme that was not in the input discards the whole generation.'],
          ].map(([h, b]) => (
            <div key={h} className="rounded-lg border border-line bg-panel p-5">
              <p className="font-bold">{h}</p>
              <p className="mt-1.5 text-[15px] leading-relaxed text-muted">{b}</p>
            </div>
          ))}
        </div>

        <div className="mt-6 grid gap-4 lg:grid-cols-2">
          <div className="rounded-lg border border-line bg-panel p-5">
            <p className="stat-lbl">What the model is not allowed to do</p>
            <p className="mt-2 text-[15px] leading-relaxed text-muted">
              With <span className="font-semibold text-bright">Compose with Claude</span> on, the reply is
              written by Claude Opus 5. Steps 1 to 4 still run first, unchanged — the model gets the facts
              and the documents, and decides the wording. Nothing else.
            </p>
            <p className="mt-2 text-[15px] leading-relaxed text-muted">
              Its output is then checked against that same context, with its own test suite (
              <code className="text-steelDim">npm run test:guard</code>). Invent a price, and the whole
              generation is discarded. With no key the page falls back to the deterministic composer and
              says so.
            </p>
          </div>

          <div className="rounded-lg border border-line bg-panel p-5">
            <p className="stat-lbl">Two things it refuses to do</p>
            <ul className="mt-2 space-y-2 text-[15px] leading-relaxed text-muted">
              <li>
                <span className="font-semibold text-bright">Train around an injury.</span> Any mention of pain
                stops program generation and routes to a human. Which substitutions are safe depends on a
                diagnosis, and no questionnaire — and no software — can make that call.
              </li>
              <li>
                <span className="font-semibold text-bright">Answer below its grounding threshold.</span> If the
                top retrieved document scores under the bar, it says it does not know rather than improvising
                something authoritative-sounding.
              </li>
            </ul>
          </div>
        </div>
        <TechBox
          rows={[
                  { k: 'Retrieval', v: <>BM25 (k1&nbsp;1.5, b&nbsp;0.75) over 406 documents, plus concept expansion scored at a discount because those terms were inferred.</> },
          { k: 'Language layer', v: <>Slot extraction into a structured profile. Anything not confidently extracted stays null and gets asked about.</> },
          { k: 'Synthesis', v: <>Deterministic, constrained to owned equipment. A pattern with no usable exercise becomes a gap resolved to a real product.</> },
          { k: 'Generation', v: <>Optional Claude Opus 5 via <C>/api/spotter</C>, rate-limited, with its output checked back against the retrieved context.</> },
          ]}
          note="Without an API key the page falls back to the deterministic composer and says so. Nothing breaks."
        />
      </div>
    </div>
  );
}
