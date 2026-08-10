/**
 * Claude Code capture entrypoint (PreToolUse/Skill + UserPromptExpansion).
 * Thin: parse Claude's payload → neutral event → shared persist, plus record an
 * identifiers-only start for the completion hook. Fail-open: any error is
 * swallowed; always exits 0 so a Skill call is never blocked.
 */
import fs from 'node:fs';
import path from 'node:path';

import {
  buildUsageEvent,
  DEFAULT_PRIVACY_LEVEL,
  defaultJsonlPath,
  logHookError,
  persistUsageEvent,
  recordSkillStart,
} from '../../index';
import { CLAUDE_SOURCE, normalizeClaudePayload } from './payload';

const main = async (): Promise<void> => {
  try {
    const repoRoot =
      process.env.CLAUDE_PROJECT_DIR ||
      process.env.OPEN_THROTTLE_REPO_ROOT ||
      process.cwd();

    const stdinBuf = fs.readFileSync(0, 'utf8');
    if (!stdinBuf || !stdinBuf.trim()) {
      return;
    }

    let raw: unknown;
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
    // the completion hook can compute duration and correlate. Fail-open inside.
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
