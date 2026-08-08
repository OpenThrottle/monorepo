#!/usr/bin/env node
/**
 * Claude Code entrypoint for skill-usage capture (PreToolUse/Skill +
 * UserPromptExpansion). Thin adapter: parse Claude's payload → neutral event →
 * shared persist. All tool-neutral logic lives in
 * .agents/hooks/skill-usage/lib.cjs; the Claude payload shape lives in
 * ./skill-usage-claude-adapter.cjs.
 *
 * Fail-open: any error is swallowed; always exit 0 so the skill is never blocked.
 *
 * Sink of record: POST recordSkillUsage to OT GraphQL (short timeout).
 * Fallback: append one JSONL line under
 *   <repo>/.cache/skill-usage/events.jsonl  (gitignored via .cache)
 *
 * Privacy default: truncated via applyPrivacy (see the shared lib).
 *
 * Env (worktree `.env` preferred over stale parent shell for OT URL/auth):
 *   OPENTHROTTLE_SERVER_APP_URL / OPENTHROTTLE_GRAPHQL_URL — server target
 *   OPENTHROTTLE_MCP_AUTH_TOKEN — Bearer for authenticated ingest
 *   SKILL_USAGE_GRAPHQL_URL / SKILL_USAGE_AUTH_TOKEN — hook-only overrides
 *   SKILL_USAGE_DISABLE_SERVER=1 — force JSONL only
 *   SKILL_USAGE_POST_TIMEOUT_MS — override default 750ms
 *   SKILL_USAGE_JSONL_PATH — override JSONL path
 */
'use strict';

const fs = require('node:fs');
const path = require('node:path');

const {
  DEFAULT_PRIVACY_LEVEL,
  buildUsageEvent,
  defaultJsonlPath,
  logHookError,
  persistUsageEvent,
  recordSkillStart,
} = require('../../.agents/hooks/skill-usage/lib.cjs');
const {
  CLAUDE_SOURCE,
  normalizeClaudePayload,
} = require('./skill-usage-claude-adapter.cjs');

const main = async () => {
  try {
    const repoRoot =
      process.env.CLAUDE_PROJECT_DIR ||
      process.env.OPEN_THROTTLE_REPO_ROOT ||
      process.cwd();

    const stdinBuf = fs.readFileSync(0, 'utf8');
    if (!stdinBuf || !stdinBuf.trim()) {
      return;
    }

    let raw;
    try {
      raw = JSON.parse(stdinBuf);
    } catch (err) {
      logHookError('invalid JSON stdin', err);
      return;
    }

    const normalized = normalizeClaudePayload(raw);
    if (!normalized) {
      return;
    }

    const event = buildUsageEvent({
      normalized,
      privacyLevel: DEFAULT_PRIVACY_LEVEL,
      repoRoot,
      source: CLAUDE_SOURCE,
    });
    if (!event) {
      return;
    }

    // Additive: remember this start (identifiers + timestamp only, no args) so
    // the completion hook can compute duration and correlate. Never blocks or
    // changes the start-event ingest below; fail-open inside recordSkillStart.
    recordSkillStart({
      repoRoot,
      scope: event.scope,
      sessionId: event.session_id,
      skillName: event.skill_name,
      startedAt: event.timestamp,
      toolUseId: event.tool_use_id ?? null,
    });

    const outPath =
      process.env.SKILL_USAGE_JSONL_PATH || defaultJsonlPath(repoRoot);

    await persistUsageEvent({
      event,
      jsonlPath: path.resolve(outPath),
      repoRoot,
    });
  } catch (err) {
    logHookError('capture failed', err);
  }
};

main().finally(() => {
  process.exit(0);
});
