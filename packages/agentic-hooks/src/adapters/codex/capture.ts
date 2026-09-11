/**
 * Codex capture entrypoint (`UserPromptSubmit`). Thin: parse Codex's payload →
 * neutral event → shared persist, plus record an identifiers-only start.
 * Fail-open: any error is swallowed; always exits 0.
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
import { CODEX_SOURCE, normalizeCodexPayload } from './payload';

const main = async (): Promise<void> => {
  try {
    const repoRoot = process.env.OPEN_THROTTLE_REPO_ROOT || process.cwd();

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

    const normalized = normalizeCodexPayload(raw);
    if (!normalized) {
      return;
    }

    const event = buildUsageEvent({
      normalized,
      privacyLevel: DEFAULT_PRIVACY_LEVEL,
      repoRoot: normalized.cwd || repoRoot,
      source: CODEX_SOURCE,
    });
    if (!event) {
      return;
    }

    recordSkillStart({
      repoRoot: event.cwd,
      scope: event.scope,
      sessionId: event.session_id,
      skillName: event.skill_name,
      startedAt: event.timestamp,
      toolUseId: event.tool_use_id ?? null,
    });

    const outPath =
      process.env.SKILL_USAGE_JSONL_PATH || defaultJsonlPath(event.cwd);

    await persistUsageEvent({
      event,
      jsonlPath: path.resolve(outPath),
      repoRoot: event.cwd,
    });
  } catch (err) {
    logHookError('capture failed', err);
  }
};

main().finally(() => {
  process.exit(0);
});
