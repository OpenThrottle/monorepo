/**
 * Manual / scheduled drain of buffered skill-usage JSONL to OT. Flushes
 * `.cache/skill-usage/{events,outcomes}.jsonl` via the same mutations, retaining
 * anything that still can't be sent. Idempotent and safe to re-run. Fail-open.
 *
 * Usage: node .claude/hooks/skill-usage-drain.cjs [--budget-ms <n>]
 */
import { drainBufferedUsage, logHookError } from '../../index';

const parseArg = (flag: string): string | undefined => {
  const idx = process.argv.indexOf(flag);
  return idx >= 0 ? process.argv[idx + 1] : undefined;
};

const main = async (): Promise<void> => {
  try {
    const repoRoot =
      process.env.CLAUDE_PROJECT_DIR ||
      process.env.OPEN_THROTTLE_REPO_ROOT ||
      process.cwd();

    const budgetRaw =
      parseArg('--budget-ms') || process.env.SKILL_USAGE_DRAIN_BUDGET_MS || '';
    // Manual runs are unbounded by default; a positive value time-boxes them.
    const budgetMs = budgetRaw === '' ? null : Number(budgetRaw) || null;

    const summary = await drainBufferedUsage({ budgetMs, repoRoot });
    process.stderr.write(
      `[skill-usage-drain] events sent=${summary.events.sent} retained=${summary.events.retained} skipped=${summary.events.skipped}; ` +
        `outcomes sent=${summary.outcomes.sent} retained=${summary.outcomes.retained} skipped=${summary.outcomes.skipped}\n`,
    );
  } catch (err) {
    logHookError('drain CLI failed', err);
  }
};

main().finally(() => {
  process.exit(0);
});
