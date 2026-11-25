/**
 * Fails `pnpm install` when the running Node does not satisfy the root
 * package.json `engines.node` range.
 *
 * Why a hand-rolled check instead of pnpm's own: pnpm only *warns* on the
 * current project's `engines` (`engine-strict` governs dependencies, not the
 * workspace root), so nothing actually stops an install on an unsupported
 * Node. The range is the runtime line: the distroless images and CI run Node
 * 26 and @types/node types Node 26 APIs, so an install on an older line would
 * type-check code that fails at runtime — later, somewhere unrelated and
 * unexplained.
 *
 * Why `.mjs` and not `.ts` like every other file in scripts/: `preinstall` runs
 * before node_modules exists, so there is no `tsx`, and Node's own type
 * stripping only exists on the very versions this script is meant to reject.
 * Plain ESM parses on any Node, which is the point.
 */

import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const MANIFEST = join(HERE, '..', 'package.json');

/**
 * The `.nvmrc` pin, for the error message only. Docker build stages copy this
 * script without `.nvmrc`, so a missing file must not turn the explanation
 * into an ENOENT stack trace.
 */
const readPinned = () => {
  try {
    return readFileSync(join(HERE, '..', '.nvmrc'), 'utf8').trim();
  } catch {
    return 'a Node version';
  }
};

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

/**
 * The bin dir of an installed nvm Node that satisfies `range`, for the error
 * message: the `.nvmrc` pin when it is installed and fits, else the newest
 * install that fits; null when none does. Same order as
 * skills/ot-worktree/scripts/resolve-node.sh, which provisions worktrees.
 * Reads directory names only; never spawns a node.
 */
export const findSatisfyingNvmBin = (range, { nvmDir, pinned }) => {
  const root = join(nvmDir, 'versions', 'node');
  const binFor = (name) => {
    return join(root, name, 'bin');
  };
  const fits = (name) => {
    const parsed = parseVersion(name);
    return (
      parsed !== null &&
      satisfies(parsed, range) === true &&
      existsSync(join(binFor(name), 'node'))
    );
  };

  const pinnedName = `v${pinned.trim().replace(/^v/, '')}`;
  if (/^v\d+\.\d+\.\d+$/.test(pinnedName) && fits(pinnedName)) {
    return binFor(pinnedName);
  }

  let names = [];
  try {
    names = readdirSync(root);
  } catch {
    return null;
  }
  const candidates = names
    .filter(fits)
    .sort((a, b) => compare(parseVersion(b), parseVersion(a)));
  return candidates.length > 0 ? binFor(candidates[0]) : null;
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
      '  Every runtime (the distroless images and CI) is Node 26, and @types/node',
    );
    console.error(
      '  types Node 26 APIs, so installing on an older line would type-check code',
    );
    console.error('  that cannot run there.');
    console.error('');
    const bin = findSatisfyingNvmBin(range, {
      nvmDir: process.env.NVM_DIR || join(process.env.HOME || '', '.nvm'),
      pinned: readPinned(),
    });
    if (bin === null) {
      console.error(
        `  This repo pins ${readPinned()} in .nvmrc — run \`nvm install\` (or \`fnm use\`) and install again.`,
      );
    } else {
      console.error(
        '  A Node that fits is installed. Run this in the same shell, then install again:',
      );
      console.error(`    export PATH="${bin}:$PATH"`);
      console.error(
        '  (In a worktree, `pnpm run worktree:heal` then finishes provisioning it.)',
      );
    }
    console.error('');
    process.exit(1);
  }
}
