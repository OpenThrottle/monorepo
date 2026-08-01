#!/usr/bin/env node
/**
 * Reference skill-usage adapter — COPY, don't require, this file.
 *
 * Copy it into your tool's own hooks folder (e.g. `.cursor/hooks/`), rename the
 * normalizer + source for your tool, then wire your tool's hook config to run
 * it on skill invocation. All tool-neutral logic stays in the shared core at
 * `.agents/hooks/skill-usage/lib.cjs` — do not fork it.
 *
 * See `.agents/hooks/skill-usage/README.md` for the full producer contract and
 * `.claude/hooks/skill-usage-capture.cjs` for a wired, tested example.
 *
 * Fail-open: swallow every error and always exit 0 so capture never blocks the
 * host tool.
 */
'use strict';

const fs = require('node:fs');
const path = require('node:path');

// Adjust the relative path to reach the shared core from your hooks folder.
const {
  DEFAULT_PRIVACY_LEVEL,
  buildUsageEvent,
  defaultJsonlPath,
  logHookError,
  persistUsageEvent,
} = require('../../.agents/hooks/skill-usage/lib.cjs');

/** Stable producer id stamped onto every event this adapter emits. */
const SOURCE = 'my-tool';

/**
 * Translate YOUR tool's native hook payload into a NormalizedInvocation, or
 * return null when the payload is not a skill invocation you want to record.
 *
 * @param {unknown} raw — parsed payload your tool handed the hook
 * @returns {{
 *   skill_name: string,
 *   args: unknown,
 *   session_id: string | null,
 *   cwd: string | null,
 *   invocation_path: 'skill_tool' | 'slash',
 * } | null}
 */
const normalizeMyToolPayload = (raw) => {
  if (!raw || typeof raw !== 'object') {
    return null;
  }
  const payload = /** @type {Record<string, unknown>} */ (raw);

  // EXAMPLE — replace with your tool's real field names.
  const skillName =
    typeof payload.skill === 'string' ? payload.skill : null;
  if (!skillName) {
    return null;
  }

  return {
    skill_name: skillName,
    args: payload.args ?? '',
    session_id:
      typeof payload.session_id === 'string' ? payload.session_id : null,
    cwd: typeof payload.cwd === 'string' ? payload.cwd : null,
    invocation_path: 'skill_tool',
  };
};

const main = async () => {
  try {
    const repoRoot = process.env.OPEN_THROTTLE_REPO_ROOT || process.cwd();

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

    const normalized = normalizeMyToolPayload(raw);
    if (!normalized) {
      return;
    }

    const event = buildUsageEvent({
      normalized,
      privacyLevel: DEFAULT_PRIVACY_LEVEL,
      repoRoot,
      source: SOURCE,
    });
    if (!event) {
      return;
    }

    await persistUsageEvent({
      event,
      jsonlPath: path.resolve(
        process.env.SKILL_USAGE_JSONL_PATH || defaultJsonlPath(repoRoot),
      ),
      repoRoot,
    });
  } catch (err) {
    logHookError('capture failed', err);
  }
};

main().finally(() => {
  process.exit(0);
});
