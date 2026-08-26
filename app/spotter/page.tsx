import spotter from '@/data/spotter.json';
import Spotter from './Spotter';
import type { SpotterIndex } from '@/lib/spotter-types';

export const metadata = { title: 'Spotter — Rana Thind × Bells of Steel' };

export default function Page() {
  const ix = spotter as unknown as SpotterIndex;
  const s = ix.stats;

  return (
    <div className="gridbg">
      <div className="mx-auto max-w-[1180px] px-6 py-12">
        <p className="eyebrow text-steelDim">Demo 05 · Product concept · Retrieval-augmented generation</p>
        <h1 className="mt-4 text-[clamp(32px,4.5vw,52px)] font-extrabold">Spotter</h1>
        <p className="mt-4 max-w-3xl text-lg leading-relaxed text-muted">
          A coach that reads your signup profile in plain language, writes a program using only the
          equipment you actually own, and changes it while you talk to it.
        </p>

        <div className="mt-6 grid gap-4 lg:grid-cols-3">
          <div className="rounded-lg border border-line bg-panel p-5">
            <p className="stat-lbl">The pitch</p>
            <p className="mt-2 text-[15px] leading-relaxed text-muted">
              The training app already has a <span className="font-semibold text-bright">Program Quiz</span> that
              recommends a program from a fixed set of answers. Spotter is that widget after it learns to
              listen — and it knows what is in your garage.
            </p>
          </div>
          <div className="rounded-lg border border-line bg-panel p-5">
            <p className="stat-lbl">Why it is defensible</p>
            <p className="mt-2 text-[15px] leading-relaxed text-muted">
              Bells of Steel sells the rack <span className="font-semibold text-bright">and</span> the
              programming. A generic fitness bot cannot write around your exact kit, and cannot tell you
              which single purchase would unlock the pattern you are missing. This can, from the live catalog.
            </p>
          </div>
          <div className="rounded-lg border border-line bg-panel p-5">
            <p className="stat-lbl">Three surfaces, one engine</p>
            <p className="mt-2 text-[15px] leading-relaxed text-muted">
              In-app after signup. On the website before purchase, where the same engine answers
              &ldquo;what do I actually need?&rdquo;. And internally, drafting programs for a human coach to
              approve — which is where it saves the most hours.
            </p>
          </div>
        </div>

        {/* provenance — the thing that has to be said plainly */}
        <div className="mt-4 rounded-lg border border-amber-500/35 bg-amber-50 p-5">
          <p className="text-[13px] font-bold uppercase tracking-wider text-amber-900">What is real here and what is mine</p>
          <p className="mt-2 max-w-4xl text-[15px] leading-relaxed text-amber-900">
            The <span className="font-bold">equipment catalog is real</span> — {s.products} live Bells of Steel
            products, the same snapshot the rest of this site runs on, so every recommendation points at a
            product that exists at a price they actually charge.
          </p>
          <p className="mt-2 max-w-4xl text-[15px] leading-relaxed text-amber-900">
            The <span className="font-bold">{s.exercises} exercises and {s.knowledge} coaching notes are mine</span>,
            written for this demo. Bells of Steel&rsquo;s real programming lives inside their training app and
            is not public. Reconstructing it from five screenshots and presenting it as theirs is exactly the
            thing the rest of this portfolio argues against, so I did not. Wired to their library it is a data
            change, not a code change.
          </p>
        </div>

        <div className="mt-10">
          <Spotter ix={ix} />
        </div>

        {/* architecture */}
        <h2 className="mt-16 text-2xl font-extrabold">How the retrieval works</h2>
        <p className="mt-3 max-w-3xl leading-relaxed text-muted">
          {s.docs} documents in one index — exercises, coaching notes and real products — with{' '}
          {s.terms} terms. Every answer above is grounded in a retrieved document, and the trace panel shows
          which ones and why.
        </p>

        <div className="mt-5 grid gap-4 md:grid-cols-2">
          {[
            ['1 · Slot extraction', 'Free text becomes a structured profile: experience, goal, days, equipment, constraints. Anything not confidently extracted stays null and gets asked about. A wrong slot produces a confidently wrong program, so this layer refuses to guess.'],
            ['2 · Hybrid retrieval', 'BM25 over the corpus (k1 1.5, b 0.75, precomputed IDF) plus a concept-expansion pass that maps everyday words onto the corpus vocabulary. Expansion terms score at a 0.35 discount because they were inferred rather than said.'],
            ['3 · Structured rerank', 'Retrieved exercises are reweighted by whether you own the equipment and whether the difficulty suits your experience. This is where a general fitness bot cannot follow — it does not know your gym.'],
            ['4 · Constrained synthesis', 'The program is assembled deterministically from retrieved candidates against a split template. Patterns with no available exercise become an explicit gap, resolved to the cheapest real product that closes it.'],
            ['5 · Generation, then verification', 'With a key configured, Claude Opus 5 receives the facts already derived and the documents already retrieved, and rewrites them as prose. The output is then checked back against that context: any price or set-and-rep scheme it names that was not in the input gets the whole generation discarded and the deterministic text kept.'],
          ].map(([h, b]) => (
            <div key={h} className="rounded-lg border border-line bg-panel p-5">
              <p className="font-bold">{h}</p>
              <p className="mt-1.5 text-[15px] leading-relaxed text-muted">{b}</p>
            </div>
          ))}
        </div>

        <div className="mt-6 grid gap-4 lg:grid-cols-2">
          <div className="rounded-lg border border-line bg-panel p-5">
            <p className="stat-lbl">The model, and what it is not allowed to do</p>
            <p className="mt-2 text-[15px] leading-relaxed text-muted">
              Toggle <span className="font-semibold text-bright">Compose with Claude</span> above and the
              reply is written by Claude Opus 5 — genuinely generative, and genuinely retrieval-augmented.
              Steps 1 through 4 still run first and unchanged. The model receives the facts already derived
              and the documents already retrieved; it decides the wording and nothing else.
            </p>
            <p className="mt-2 text-[15px] leading-relaxed text-muted">
              Then its output is checked against that same context. If it names a price or a set scheme that
              was not in the input, the generation is thrown away and you get the deterministic text with a
              note saying why. The guard has its own test suite —{' '}
              <code className="text-steelDim">npm run test:guard</code> — because a guard that wrongly
              rejects good output fails silently and looks like the feature never worked.
            </p>
            <p className="mt-2 text-[15px] leading-relaxed text-muted">
              With no key configured the page degrades to the deterministic composer and says so. Nothing
              about the demo breaks; the prose just gets flatter.
            </p>
          </div>

          <div className="rounded-lg border border-line bg-panel p-5">
            <p className="stat-lbl">Two things it refuses to do</p>
            <ul className="mt-2 space-y-2 text-[15px] leading-relaxed text-muted">
              <li>
                <span className="font-semibold text-bright">Train around an injury.</span> Any mention of pain
                stops program generation and routes to a human. Which substitutions are safe depends on a
                diagnosis, and no questionnaire can make that call.
              </li>
              <li>
                <span className="font-semibold text-bright">Answer below its grounding threshold.</span> If the
                top retrieved document scores under the bar, it says it does not know rather than improvising
                something authoritative-sounding.
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
