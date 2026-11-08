/**
 * The machine paths a recording tokenizes, listed for the replaying machine.
 * Recorder and replay bin must agree on these tokens, so both read them from
 * here.
 *
 * Every path is listed in each of its spellings. On macOS `/var/folders/…` and
 * `/private/var/folders/…` are one directory: a child's `process.cwd()` reports
 * the resolved form while the argv a backend built carries the literal one, so
 * matching either alone misses the other.
 *
 * Node built-ins only: the replay bin imports this under type stripping.
 */

import { existsSync, realpathSync } from 'node:fs';
import { homedir, tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';

import type { SanitizerPath } from '../sanitizer/sanitizer.ts';

/**
 * The OpenThrottle checkout this package lives in. Plan-run prompts name it
 * (the foreign-workspace layer says where the OT monorepo is), and it differs
 * per machine and per worktree. Derived from this file's own location —
 * `packages/agentic-replay-testing/src/utils/replay/` — so recorder and replay
 * bin agree without any env.
 */
const OT_ROOT = fileURLToPath(
  new URL('../../../../../', import.meta.url),
).replace(/\/$/, '');

function resolve(path: string): string {
  return existsSync(path) ? realpathSync(path) : path;
}

/**
 * Every spelling of `path`: as given, resolved, and with each known base's
 * literal and resolved prefixes swapped.
 */
function spellings(path: string, bases: readonly string[]): string[] {
  const forms = new Set([path, resolve(path)]);

  for (const base of bases) {
    const literal = base;
    const resolved = resolve(base);
    for (const form of [...forms]) {
      if (form.startsWith(resolved)) {
        forms.add(`${literal}${form.slice(resolved.length)}`);
      }
      if (form.startsWith(literal)) {
        forms.add(`${resolved}${form.slice(literal.length)}`);
      }
    }
  }

  return [...forms];
}

/**
 * Paths to tokenize for a spawn that ran in `cwd`.
 *
 * @public
 */
export function replayPaths(cwd: string): SanitizerPath[] {
  const bases = [tmpdir(), homedir()];
  const entries: Array<readonly [string, string]> = [
    [cwd, '<CWD>'],
    [OT_ROOT, '<OT_ROOT>'],
    [tmpdir(), '<TMP>'],
    [homedir(), '<HOME>'],
  ];

  return entries.flatMap(([path, token]) => {
    return spellings(path, bases).map((spelling) => ({
      path: spelling,
      token,
    }));
  });
}
