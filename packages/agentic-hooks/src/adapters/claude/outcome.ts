/**
 * Opt-in outcome/duration enrichment for skills WE author (Phase 4). Additive —
 * the harness capture path remains primary. Call at skill completion to record
 * an outcome + optional duration correlated by session_id + skill_name.
 *
 * This is the ONLY path that may claim `success` or `error`, and the only path
 * that may report a duration: the automatic session-end hooks cannot observe
 * either (see `completeOpenStartsForSession`). It is therefore what makes the
 * `/usage` Outcomes column mean anything — a skill that never calls this shows
 * as not measured, which is the honest reading of "nobody measured".
 *
 * Without `--duration-ms` the duration is derived from the skill's own open
 * start (load → this call); see `claimLatestStart`. Session id defaults to
 * `$CLAUDE_CODE_SESSION_ID`.
 *
 * Usage:
 *   node .claude/hooks/skill-usage-outcome.cjs --skill ot-plans --outcome success
 */
import path from 'node:path';

import {
  buildOutcomeEvent,
  claimLatestStart,
  defaultOutcomesJsonlPath,
  logHookError,
  persistOutcomeEvent,
  resolveHookRepoRoot,
  SKILL_USAGE_OUTCOMES,
} from '../../index.ts';
import { parseOutcomeArgs } from './outcome-args.ts';
import { CLAUDE_SOURCE } from './payload.ts';

const main = async (): Promise<void> => {
  try {
    const args = parseOutcomeArgs(process.argv.slice(2));
    // The reporter runs from the agent's shell, so its cwd is where the work
    // happened — the same checkout resolution the capture hook uses.
    const repoRoot = resolveHookRepoRoot({
      payloadCwd: process.cwd(),
      projectDir:
        process.env.CLAUDE_PROJECT_DIR ||
        process.env.OPEN_THROTTLE_REPO_ROOT ||
        process.cwd(),
    });

    const skillName =
      args.skill || process.env.OPENTHROTTLE_TELEMETRY_SKILL_NAME || '';
    const outcome =
      args.outcome || process.env.OPENTHROTTLE_TELEMETRY_OUTCOME || '';
    const sessionId =
      args.session ||
      process.env.OPENTHROTTLE_TELEMETRY_SESSION_ID ||
      // What Claude Code actually exports to the Bash tool; the older
      // CLAUDE_SESSION_ID is unset there, which left every reporter row
      // uncorrelated.
      process.env.CLAUDE_CODE_SESSION_ID ||
      process.env.CLAUDE_SESSION_ID ||
      null;
    const toolUseId =
      args['tool-use-id'] ||
      process.env.OPENTHROTTLE_TELEMETRY_TOOL_USE_ID ||
      null;
    const durationRaw =
      args['duration-ms'] ||
      process.env.OPENTHROTTLE_TELEMETRY_DURATION_MS ||
      '';
    const explicitDurationMs = durationRaw === '' ? null : Number(durationRaw);

    // `session_ended` is deliberately NOT accepted here. It is the automatic
    // session-end path's way of saying "no quality claim"; a deliberate
    // reporter, which by definition knows how the work went, has no reason to
    // emit it and would only dilute the honest values.
    if (
      outcome !== SKILL_USAGE_OUTCOMES.SUCCESS &&
      outcome !== SKILL_USAGE_OUTCOMES.ABANDONED &&
      outcome !== SKILL_USAGE_OUTCOMES.ERROR
    ) {
      logHookError(
        `invalid --outcome (want ${[
          SKILL_USAGE_OUTCOMES.SUCCESS,
          SKILL_USAGE_OUTCOMES.ABANDONED,
          SKILL_USAGE_OUTCOMES.ERROR,
        ].join('|')})`,
      );
      return;
    }

    // Always claim this skill's open start, so the turn-end hook does not add
    // a second, session_ended row for the same invocation; its load→now span
    // is the duration unless the caller measured one itself.
    const claimedDurationMs = claimLatestStart({ sessionId, skillName });
    const durationMs = explicitDurationMs ?? claimedDurationMs;

    const event = buildOutcomeEvent({
      deliberate: true,
      durationMs,
      outcome,
      repoRoot,
      sessionId,
      skillName,
      source: CLAUDE_SOURCE,
      toolUseId,
    });
    if (!event) {
      logHookError('could not build outcome event (missing --skill?)');
      return;
    }

    const outPath = defaultOutcomesJsonlPath();

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
