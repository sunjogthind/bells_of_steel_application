// Tests the post-generation guard without spending an API call.
// Run: npm run test:guard
import { readFileSync, writeFileSync, unlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

// Strip the TS annotations so the real source can be imported directly - the
// point is to test the shipped file, not a copy of it that can drift.
const src = readFileSync('lib/spotter-guard.ts', 'utf8')
  .replace(/:\s*string\[\]/g, '').replace(/:\s*string/g, '');
const tmp = join(tmpdir(), `spotter-guard-${Date.now()}.mjs`);
writeFileSync(tmp, src);
const { inventedFacts } = await import(`file://${tmp}`);
unlinkSync(tmp);

const ground = 'Cheapest fix is Powder Coated Kettlebells at $29.99. Barbell Bench Press 4 × 4–6. Pull-Up 3 × 8–10.';

const cases = [
  ['faithful, ascii',   'Kettlebells run $29.99. Bench is 4 x 4-6.',   false],
  ['faithful, unicode', 'Bench: 4 × 4–6, pull-ups 3 × 8–10.',          false],
  ['invented price',    'The kettlebells are $24.99, a bargain.',      true],
  ['invented sets',     'Bench press for 5 x 12 to start.',            true],
  ['no numbers',        'Add a horizontal pull when you can.',         false],
  ['price with comma',  'The rack is $1,299.99.',                      true],
  ['comma in ground',   'That is $29.99 exactly.',                     false],
];

let failed = 0;
for (const [name, reply, shouldFlag] of cases) {
  const got = inventedFacts(reply, ground);
  const ok = (got.length > 0) === shouldFlag;
  if (!ok) failed++;
  console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${name.padEnd(18)} -> ${got.length ? got.join(', ') : 'clean'}`);
}
console.log(`\n  ${cases.length - failed}/${cases.length} passed`);
process.exit(failed ? 1 : 0);
