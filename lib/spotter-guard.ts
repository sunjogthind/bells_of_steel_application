/**
 * Post-generation guard.
 *
 * The model is handed facts and asked to rewrite them. This checks that it did
 * not quietly add any. Prices are the highest-risk class - a wrong number that
 * reads fluently is worse than no answer - so every monetary figure in the
 * reply must appear in the material the model was given. Set-and-rep schemes
 * get the same treatment, because they are the other number a reader acts on.
 *
 * Both sides are normalised identically before comparison. Skipping that gives
 * false positives on cosmetic differences ("4 x 4-6" vs "4 × 4–6"), and a guard
 * that rejects good generations is worse than no guard: it fails silently and
 * looks like the feature simply never works.
 *
 * Extracted from the route so it can be tested without spending an API call.
 */

/** Unify the characters that differ cosmetically between prose and data. */
const normalise = (s: string) =>
  s.toLowerCase()
    .replace(/[,\s]/g, '')
    .replace(/[×✕✖]/g, 'x')
    .replace(/[–, −]/g, '-');

export function inventedFacts(reply: string, grounding: string): string[] {
  const problems: string[] = [];
  const ground = normalise(grounding);

  const money = reply.match(/\$[\d,]+(?:\.\d{2})?/g) ?? [];
  money.forEach((m) => {
    if (!ground.includes(normalise(m))) problems.push(`price ${m}`);
  });

  const schemes = reply.match(/\b\d+\s*[x×]\s*\d+(?:\s*[–, -]\s*\d+)?\b/gi) ?? [];
  schemes.forEach((sc) => {
    if (!ground.includes(normalise(sc))) problems.push(`set scheme ${sc}`);
  });

  return Array.from(new Set(problems));
}
