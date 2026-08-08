#!/usr/bin/env node
/**
 * Manual / scheduled drain of buffered skill-usage JSONL to OT.
 *
 * When the server was down, skill-usage-capture.cjs / skill-usage-complete.cjs
 * fall back to `.cache/skill-usage/{events,outcomes}.jsonl`. This CLI flushes
 * those buffers to OT via the same mutations, retaining anything that still
 * can't be sent. Idempotent and safe to re-run (cron, git hook, ad hoc).
 *
 * The Stop completion hook already triggers a small time-boxed drain
 * opportunistically; run this for an unbounded catch-up flush.
 *
 * Usage:
 *   node .claude/hooks/skill-usage-drain.cjs [--budget-ms <n>]
 *
 * Flags / env:
 *   --budget-ms / SKILL_USAGE_DRAIN_BUDGET_MS — wall-clock budget across both
 *     files; omit / 0 for unbounded (default here: unbounded for a manual run).
 *   Same OT URL/auth resolution as the capture hook.
 */
'use strict';

const {
  drainBufferedUsage,
  logHookError,
} = require('../../.agents/hooks/skill-usage/lib.cjs');

const parseArg = (flag) => {
  const idx = process.argv.indexOf(flag);
  return idx >= 0 ? process.argv[idx + 1] : undefined;
};

const main = async () => {
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
