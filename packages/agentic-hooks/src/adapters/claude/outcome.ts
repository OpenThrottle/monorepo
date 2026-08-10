/**
 * Opt-in outcome/duration enrichment for skills WE author (Phase 4). Additive —
 * the harness capture path remains primary. Call at skill completion to record
 * an outcome + optional duration correlated by session_id + skill_name.
 *
 * Usage:
 *   node .claude/hooks/skill-usage-outcome.cjs --skill ot-plans \
 *     --outcome success --duration-ms 4200 --session "$CLAUDE_SESSION_ID"
 */
import path from 'node:path';

import {
  buildOutcomeEvent,
  defaultOutcomesJsonlPath,
  logHookError,
  persistOutcomeEvent,
  SKILL_USAGE_OUTCOMES,
} from '../../index';

const parseArgs = (argv: string[]): Record<string, string> => {
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

const main = async (): Promise<void> => {
  try {
    const args = parseArgs(process.argv.slice(2));
    const repoRoot =
      process.env.CLAUDE_PROJECT_DIR ||
      process.env.OPEN_THROTTLE_REPO_ROOT ||
      process.cwd();

    const skillName = args.skill || process.env.SKILL_USAGE_SKILL_NAME || '';
    const outcome = args.outcome || process.env.SKILL_USAGE_OUTCOME || '';
    const sessionId =
      args.session ||
      process.env.SKILL_USAGE_SESSION_ID ||
      process.env.CLAUDE_SESSION_ID ||
      null;
    const toolUseId =
      args['tool-use-id'] || process.env.SKILL_USAGE_TOOL_USE_ID || null;
    const durationRaw =
      args['duration-ms'] || process.env.SKILL_USAGE_DURATION_MS || '';
    const durationMs = durationRaw === '' ? null : Number(durationRaw);

    if (
      outcome !== SKILL_USAGE_OUTCOMES.SUCCESS &&
      outcome !== SKILL_USAGE_OUTCOMES.ABANDONED &&
      outcome !== SKILL_USAGE_OUTCOMES.ERROR
    ) {
      logHookError(
        `invalid --outcome (want ${Object.values(SKILL_USAGE_OUTCOMES).join('|')})`,
      );
      return;
    }

    const event = buildOutcomeEvent({
      durationMs,
      outcome,
      repoRoot,
      sessionId,
      skillName,
      toolUseId,
    });
    if (!event) {
      logHookError('could not build outcome event (missing --skill?)');
      return;
    }

    const outPath =
      process.env.SKILL_USAGE_OUTCOMES_JSONL_PATH ||
      defaultOutcomesJsonlPath(repoRoot);

    await persistOutcomeEvent({
      event,
      jsonlPath: path.resolve(outPath),
      repoRoot,
    });
  } catch (err) {
    logHookError('outcome helper failed', err);
  }
};

main().finally(() => {
  process.exit(0);
});
