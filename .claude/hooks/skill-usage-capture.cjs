#!/usr/bin/env node
/**
 * Phase 1 — Skill usage JSONL capture (PreToolUse/Skill + UserPromptExpansion).
 *
 * Fail-open: any error is swallowed; always exit 0 so the skill is never blocked.
 *
 * Writes one line per invocation to:
 *   <repo>/.cache/skill-usage/events.jsonl  (gitignored via .cache)
 *
 * Privacy default: truncated via applyPrivacy (see skill-usage-lib.cjs).
 */
'use strict';

const fs = require('node:fs');
const path = require('node:path');

const {
  DEFAULT_PRIVACY_LEVEL,
  appendJsonl,
  buildUsageEvent,
  defaultJsonlPath,
  logHookError,
  normalizeHookPayload,
} = require('./skill-usage-lib.cjs');

const main = () => {
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
    appendJsonl(path.resolve(outPath), event);
  } catch (err) {
    logHookError('capture failed', err);
  }
};

main();
process.exit(0);
