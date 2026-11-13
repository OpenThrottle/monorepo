/**
 * Argument parsing for the outcome helper (`./outcome.ts`). Kept apart from the
 * entrypoint so the flag rules can be tested without the entrypoint's
 * `process.exit`.
 *
 * Deliberately lenient, unlike `./backfill-args.ts`: the helper is called from
 * skills at completion and must never fail the work it reports on, so unknown
 * flags are kept rather than rejected and stray positionals are skipped.
 */

/**
 * Parse `argv` (without the node and script entries) into a flag map. A
 * `--flag` followed by a token that does not start with `--` takes that token
 * as its value; any other `--flag` is bare and reads as `'1'`. Tokens that are
 * not flags and are not consumed as a value are ignored. A repeated flag keeps
 * its last value.
 */
export const parseOutcomeArgs = (
  argv: readonly string[],
): Readonly<Record<string, string>> => {
  const out: Record<string, string> = {};
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (!token || !token.startsWith('--')) {
      continue;
    }
    const key = token.slice(2);
    const next = argv[i + 1];
    if (next != null && !next.startsWith('--')) {
      out[key] = next;
      i += 1;
    } else {
      out[key] = '1';
    }
  }
  return out;
};
