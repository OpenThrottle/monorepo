#!/usr/bin/env node
/**
 * Phase 1 + 2b — Skill usage capture (PreToolUse/Skill + UserPromptExpansion).
 *
 * Fail-open: any error is swallowed; always exit 0 so the skill is never blocked.
 *
 * Sink of record: POST recordSkillUsage to OT GraphQL (short timeout).
 * Fallback: append one JSONL line under
 *   <repo>/.cache/skill-usage/events.jsonl  (gitignored via .cache)
 *
 * Privacy default: truncated via applyPrivacy (see skill-usage-lib.cjs).
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
  normalizeHookPayload,
  persistUsageEvent,
} = require('./skill-usage-lib.cjs');

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

    const normalized = normalizeHookPayload(raw);
    if (!normalized) {
      return;
    }

    const event = buildUsageEvent({
      normalized,
      privacyLevel: DEFAULT_PRIVACY_LEVEL,
      repoRoot,
    });
    if (!event) {
      return;
    }

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
