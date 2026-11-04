/**
 * Fails `pnpm install` when the running Node does not satisfy the root
 * package.json `engines.node` range.
 *
 * Why a hand-rolled check instead of pnpm's own: pnpm only *warns* on the
 * current project's `engines` (`engine-strict` governs dependencies, not the
 * workspace root), so nothing actually stops an install on an unsupported
 * Node. NestJS 12 requires v20.19+/v22.12+ at runtime and v22.22.3+/v24.15+/
 * v26+ for its CLI, and the 21.x/23.x/25.x lines are unsupported entirely —
 * an install on one of those fails later, somewhere unrelated and unexplained.
 *
 * Why `.mjs` and not `.ts` like every other file in scripts/: `preinstall` runs
 * before node_modules exists, so there is no `tsx`, and Node's own type
 * stripping only exists on the very versions this script is meant to reject.
 * Plain ESM parses on any Node, which is the point.
 */

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const MANIFEST = join(HERE, '..', 'package.json');

/** Parse `major.minor.patch` off the front of a version-ish string. */
export const parseVersion = (value) => {
  const match = /^v?(\d+)(?:\.(\d+))?(?:\.(\d+))?/.exec(value.trim());
  if (match === null) return null;
  return [Number(match[1]), Number(match[2] ?? 0), Number(match[3] ?? 0)];
};

const compare = (a, b) => {
  for (let index = 0; index < 3; index += 1) {
    if (a[index] !== b[index]) return a[index] < b[index] ? -1 : 1;
  }
  return 0;
};

/**
 * Evaluate one comparator (`>=22.22.3`, `<23`, `22.x`) against a version.
 * Deliberately supports only the operators the declared range uses — a range
 * this script cannot parse is reported rather than silently passed.
 */
const satisfiesComparator = (version, comparator) => {
  const match = /^(>=|<=|>|<|=)?\s*(.+)$/.exec(comparator);
  if (match === null) return null;
  const operator = match[1] ?? '=';
  const bound = parseVersion(match[2]);
  if (bound === null) return null;
  const order = compare(version, bound);
  if (operator === '>=') return order >= 0;
  if (operator === '>') return order > 0;
  if (operator === '<=') return order <= 0;
  if (operator === '<') return order < 0;
  return order === 0;
};

/** A range is `||`-separated alternatives of space-separated comparators. */
export const satisfies = (version, range) => {
  const alternatives = range.split('||');
  for (const alternative of alternatives) {
    const comparators = alternative.trim().split(/\s+/).filter(Boolean);
    if (comparators.length === 0) continue;
    const results = comparators.map((c) => satisfiesComparator(version, c));
    if (results.includes(null)) return null;
    if (results.every(Boolean)) return true;
  }
  return false;
};

/** Only enforce when run as the preinstall script, so tests can import the range logic. */
if (
  process.argv[1] !== undefined &&
  fileURLToPath(import.meta.url) === process.argv[1]
) {
  const manifest = JSON.parse(readFileSync(MANIFEST, 'utf8'));
  const range = manifest.engines?.node;

  if (typeof range !== 'string') {
    console.error(
      '✖ Root package.json has no engines.node range to check against.',
    );
    process.exit(1);
  }

  const current = parseVersion(process.version);
  const result = current === null ? null : satisfies(current, range);

  if (result === null) {
    console.error(
      `✖ Could not evaluate engines.node range "${range}" against ${process.version}.`,
    );
    console.error(
      '  Fix the range, or teach scripts/check-node-engine.mjs the operator it uses.',
    );
    process.exit(1);
  }

  if (!result) {
    console.error('');
    console.error(
      `✖ Node ${process.version} is not supported by this workspace.`,
    );
    console.error(`  Required (package.json engines.node): ${range}`);
    console.error('');
    console.error(
      '  NestJS 12 needs v20.19+/v22.12+ to run and v22.22.3+/v24.15+/v26+ for its CLI.',
    );
    console.error(
      '  The 21.x, 23.x and 25.x lines are unsupported Node releases.',
    );
    console.error('');
    console.error(
      `  This repo pins ${readFileSync(join(HERE, '..', '.nvmrc'), 'utf8').trim()} in .nvmrc — run \`nvm use\` (or \`fnm use\`) and install again.`,
    );
    console.error('');
    process.exit(1);
  }
}
