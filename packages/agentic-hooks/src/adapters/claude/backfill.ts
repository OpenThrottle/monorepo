/**
 * One-off, operator-run backfill of skill events and per-request token usage
 * from THIS repository's Claude Code transcripts. NOT a hook: nothing registers
 * it, and it is not shipped in the plugin payload.
 *
 * Usage: node .claude/hooks/skill-usage-backfill.cjs [--dry-run] [--since <ISO>]
 *   [--until <ISO>] [--projects-dir <path>] [--repo-root <path>] [--no-worktrees]
 *   [--timeout-ms <n>]
 *
 * Idempotent: re-running sends the same rows and the server's idempotency keys
 * make it a no-op. Run `--dry-run` first. Exits 1 on a usage error or when a
 * real run has no endpoint to send to; a hook never does, this is a CLI.
 * See `transcript-backfill.ts` for what is read, what is sent and how.
 */
import { logHookError } from '../../index.ts';
import { BACKFILL_USAGE, parseBackfillArgs } from './backfill-args.ts';
import { runBackfill } from './backfill-run.ts';

const main = async (): Promise<number> => {
  const parsed = parseBackfillArgs({
    argv: process.argv.slice(2),
    cwd: process.cwd(),
    env: process.env,
    now: new Date(),
  });
  if (parsed.kind === 'help') {
    process.stdout.write(`${BACKFILL_USAGE}\n`);
    return 0;
  }
  if (parsed.kind === 'error') {
    process.stderr.write(`${parsed.error}\n${BACKFILL_USAGE}\n`);
    return 1;
  }
  return runBackfill({
    options: parsed.options,
    stderr: (text) => process.stderr.write(text),
    stdout: (text) => process.stdout.write(text),
  });
};

main()
  .then((code) => {
    process.exitCode = code;
  })
  .catch((err: unknown) => {
    logHookError('backfill failed', err);
    process.exitCode = 1;
  });
