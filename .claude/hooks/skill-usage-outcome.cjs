#!/usr/bin/env node
/**
 * Phase 4 — Opt-in outcome/duration enrichment for skills WE author.
 *
 * Additive ONLY. The harness PreToolUse / UserPromptExpansion hook remains
 * the primary capture path for all skills (ours + third-party). Call this at
 * skill completion when you want outcome + optional duration correlated to
 * the start event via session_id + skill_name (+ optional tool_use_id).
 *
 * Missing outcomes are a valid state (third-party skills, abandoned runs,
 * skills that do not opt in).
 *
 * Usage:
 *   node .claude/hooks/skill-usage-outcome.cjs \
 *     --skill ot-plans \
 *     --outcome success \
 *     --duration-ms 4200 \
 *     --session "$CLAUDE_SESSION_ID"
 *
 * Flags / env:
 *   --skill / SKILL_USAGE_SKILL_NAME (required)
 *   --outcome / SKILL_USAGE_OUTCOME   success|abandoned|error (required)
 *   --duration-ms / SKILL_USAGE_DURATION_MS
 *   --session / SKILL_USAGE_SESSION_ID / CLAUDE_SESSION_ID
 *   --tool-use-id / SKILL_USAGE_TOOL_USE_ID
 *   Same OT URL/auth + fail-open JSONL fallback as skill-usage-capture.cjs
 *   (outcomes land in .cache/skill-usage/outcomes.jsonl when the server is down).
 */
'use strict';

const path = require('node:path');

const {
  SKILL_USAGE_OUTCOMES,
  buildOutcomeEvent,
  defaultOutcomesJsonlPath,
  logHookError,
  persistOutcomeEvent,
} = require('../../.agents/hooks/skill-usage/lib.cjs');

/**
 * @param {string[]} argv
 * @returns {Record<string, string>}
 */
const parseArgs = (argv) => {
  /** @type {Record<string, string>} */
  const out = {};
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

const main = async () => {
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
