/* ------------------------------------------------------------------ *
 * Spotter — the generation half of RAG.
 *
 * Everything that decides what the answer is ALLOWED to say has already
 * happened by the time this route runs: retrieval, the grounding threshold,
 * the safety gate, and deterministic synthesis. Claude only rewrites the
 * result as prose.
 *
 * The model's output is then checked back against the context it was given.
 * If it names a price or a product that was not in the retrieved set, the
 * generation is discarded and the deterministic text is used instead. The
 * model is a presentation layer; it is never the source of truth.
 * ------------------------------------------------------------------ */
import Anthropic from '@anthropic-ai/sdk';
import { NextResponse } from 'next/server';
import { inventedFacts } from '@/lib/spotter-guard';

export const runtime = 'nodejs';
export const maxDuration = 30;

const MODEL = 'claude-opus-5';
const MAX_TOKENS = 1200;

/* ---------- rate limiting ----------
   Per-instance and therefore best-effort on serverless, but it bounds the
   blast radius of a public demo page that spends real money. */
const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 8;
const hits = new Map<string, number[]>();

function rateLimited(ip: string) {
  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < WINDOW_MS);
  recent.push(now);
  hits.set(ip, recent);
  if (hits.size > 500) hits.clear(); // crude ceiling on memory
  return recent.length > MAX_PER_WINDOW;
}

const SYSTEM = `You are Spotter, a strength-training assistant for Bells of Steel.

You will be given:
  FACTS    - statements already derived deterministically. They are correct.
  CONTEXT  - the documents retrieved for this question.

Rewrite the FACTS as a natural, warm reply to the user's message.

Absolute rules:
- Use ONLY information present in FACTS and CONTEXT. Introduce nothing else.
- Never state a price, product name, exercise name, set count or rep range that
  does not appear verbatim in FACTS or CONTEXT.
- Do not add training advice, encouragement, or caveats that were not given to you.
- If FACTS say a question cannot be answered, say that plainly. Do not soften it
  into a partial answer.
- Keep the meaning identical. You are changing the wording, not the content.

Voice: direct, plain, a little dry. Short sentences. No exclamation marks, no
hype, no emoji. Two or three short paragraphs at most.`;

export async function POST(req: Request) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(
      { available: false, reason: 'No ANTHROPIC_API_KEY configured — the deterministic composer is handling replies.' },
      { status: 503 }
    );
  }

  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'local';
  if (rateLimited(ip)) {
    return NextResponse.json(
      { available: false, reason: 'Rate limit reached for this demo. Falling back to the deterministic composer.' },
      { status: 429 }
    );
  }

  let body: { question?: string; facts?: string[]; context?: { title: string; note: string }[] };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ available: false, reason: 'Malformed request body.' }, { status: 400 });
  }

  const question = (body.question ?? '').slice(0, 600);
  const facts = (body.facts ?? []).join('\n').slice(0, 4000);
  const context = (body.context ?? [])
    .map((c) => `- ${c.title} (${c.note})`).join('\n').slice(0, 2000);

  if (!facts) {
    return NextResponse.json({ available: false, reason: 'Nothing to compose.' }, { status: 400 });
  }

  const grounding = `${facts}\n${context}`;

  try {
    const client = new Anthropic();
    const response = await client.beta.messages.create({
      model: MODEL,
      max_tokens: MAX_TOKENS,
      // Simple rewriting task - low effort is the right spend here.
      output_config: { effort: 'low' },
      // Server-side fallback so a safety refusal degrades instead of erroring.
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
      system: SYSTEM,
      messages: [{
        role: 'user',
        content: `USER MESSAGE:\n${question}\n\nFACTS:\n${facts}\n\nCONTEXT:\n${context || '(none retrieved)'}`,
      }],
    } as any);

    if ((response as any).stop_reason === 'refusal') {
      return NextResponse.json(
        { available: false, reason: 'The model declined this one. Deterministic text used instead.' },
        { status: 200 }
      );
    }

    const text = (response.content ?? [])
      .filter((b: any) => b.type === 'text')
      .map((b: any) => b.text)
      .join('\n')
      .trim();

    if (!text) {
      return NextResponse.json({ available: false, reason: 'Empty completion.' }, { status: 200 });
    }

    // The check that makes this safe to ship.
    const problems = inventedFacts(text, grounding);
    if (problems.length) {
      return NextResponse.json({
        available: false,
        rejected: true,
        reason: `Generation discarded — it introduced ${problems.join(', ')} not present in the retrieved context.`,
      }, { status: 200 });
    }

    return NextResponse.json({
      available: true,
      text: text.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean),
      model: MODEL,
      usage: {
        input: (response as any).usage?.input_tokens ?? null,
        output: (response as any).usage?.output_tokens ?? null,
      },
    });
  } catch (error) {
    // Most specific first, per the SDK's typed error classes.
    if (error instanceof Anthropic.AuthenticationError) {
      return NextResponse.json({ available: false, reason: 'API key rejected.' }, { status: 200 });
    }
    if (error instanceof Anthropic.RateLimitError) {
      return NextResponse.json({ available: false, reason: 'Upstream rate limit — deterministic text used.' }, { status: 200 });
    }
    if (error instanceof Anthropic.BadRequestError) {
      return NextResponse.json({ available: false, reason: `Bad request: ${error.message}` }, { status: 200 });
    }
    if (error instanceof Anthropic.APIError) {
      return NextResponse.json({ available: false, reason: `API error ${error.status}.` }, { status: 200 });
    }
    return NextResponse.json({ available: false, reason: 'Unexpected error composing the reply.' }, { status: 200 });
  }
}
