/**
 * Manual / scheduled drain of buffered skill-usage JSONL to OT. Flushes
 * `~/.openthrottle/skill-usage/{events,outcomes}.jsonl` via the same mutations,
 * retaining anything that still can't be sent and dead-lettering anything the
 * server rejects outright. Idempotent and safe to re-run. Fail-open.
 *
 * Usage: node .claude/hooks/skill-usage-drain.cjs [--budget-ms <n>] [--replay-dead-letter]
 *
 * `--replay-dead-letter` moves dead-lettered lines back into the live buffers
 * first — run it once after fixing whatever the server was rejecting.
 */
import {
  defaultJsonlPath,
  defaultOutcomesJsonlPath,
  defaultTokenUsageJsonlPath,
  defaultTrajectoriesJsonlPath,
  drainBufferedTrajectories,
  drainBufferedUsage,
  formatBufferStats,
  formatDrainFileResult,
  logHookError,
  readBufferStats,
  replayDeadLetter,
} from '../../index.ts';

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

    if (process.argv.includes('--replay-dead-letter')) {
      const replayed =
        replayDeadLetter(defaultJsonlPath()) +
        replayDeadLetter(defaultOutcomesJsonlPath()) +
        replayDeadLetter(defaultTokenUsageJsonlPath()) +
        replayDeadLetter(defaultTrajectoriesJsonlPath());
      process.stderr.write(
        `[skill-usage-drain] replayed ${replayed} dead-lettered line(s)\n`,
      );
    }

    process.stderr.write(
      `[skill-usage-drain] ${formatBufferStats('buffered before', readBufferStats(), Date.now())}\n`,
    );

    const budgetRaw =
      parseArg('--budget-ms') ||
      process.env.OPENTHROTTLE_TELEMETRY_DRAIN_BUDGET_MS ||
      '';
    // Manual runs are unbounded by default; a positive value time-boxes them.
    const budgetMs = budgetRaw === '' ? null : Number(budgetRaw) || null;

    const summary = await drainBufferedUsage({ budgetMs, repoRoot });
    const trajectories = await drainBufferedTrajectories({
      budgetMs,
      repoRoot,
    });
    process.stderr.write(
      `[skill-usage-drain] ${formatDrainFileResult('events', summary.events)}\n` +
        `[skill-usage-drain] ${formatDrainFileResult('outcomes', summary.outcomes)}\n` +
        `[skill-usage-drain] ${formatDrainFileResult('token-usage', summary.tokenUsage)}\n` +
        `[skill-usage-drain] ${formatDrainFileResult('trajectories', trajectories)}\n`,
    );
    process.stderr.write(
      `[skill-usage-drain] ${formatBufferStats('buffered after', readBufferStats(), Date.now())}\n`,
    );
  } catch (err) {
    logHookError('drain CLI failed', err);
  }
};

main().finally(() => {
  process.exit(0);
});
