/**
 * Session-scoped start-correlation store. The capture path records an
 * identifiers-only start per invocation; the completion path reads them to
 * compute duration and mark unresolved starts abandoned. All fail-open.
 */
import fs from 'node:fs';

import {
  appendJsonl,
  defaultStartsDir,
  startCorrelationKey,
  startsFilePathForSession,
} from './jsonl';
import { logHookError } from '../utils/logging';

const isRecord = (value: unknown): value is Record<string, unknown> =>
  value != null && typeof value === 'object';

/**
 * Record a start-correlation entry (identifiers + timestamp only — NO args)
 * under `.cache/skill-usage/starts/<session_id>.jsonl`. Skips (does not error)
 * when session_id or skill_name is missing.
 *
 * @public
 */
export const recordSkillStart = ({
  repoRoot,
  sessionId,
  skillName,
  toolUseId = null,
  scope = null,
  startedAt = new Date().toISOString(),
  startsDir,
}: {
  repoRoot: string;
  scope?: string | null;
  sessionId: string | null | undefined;
  skillName: string | null | undefined;
  startedAt?: string;
  startsDir?: string;
  toolUseId?: string | null;
}): { ok: false; reason: string } | { ok: true; path: string } => {
  try {
    const sid = typeof sessionId === 'string' ? sessionId.trim() : '';
    const name = typeof skillName === 'string' ? skillName.trim() : '';
    if (!sid || !name) {
      return { ok: false, reason: 'missing session_id or skill_name' };
    }
    const dir = startsDir || defaultStartsDir(repoRoot);
    const filePath = startsFilePathForSession(dir, sid);
    appendJsonl(filePath, {
      scope: scope ?? null,
      session_id: sid,
      skill_name: name,
      started_at: startedAt,
      tool_use_id: toolUseId ?? null,
    });
    return { ok: true, path: filePath };
  } catch (err) {
    logHookError('recordSkillStart failed', err);
    return {
      ok: false,
      reason: err instanceof Error ? err.message : String(err),
    };
  }
};

/**
 * List open start-correlation entries for a session. Missing file → [];
 * malformed lines are skipped. Fail-open (never throws).
 *
 * @public
 */
export const listStartsForSession = ({
  repoRoot,
  sessionId,
  startsDir,
}: {
  repoRoot: string;
  sessionId: string | null | undefined;
  startsDir?: string;
}): Array<Record<string, unknown>> => {
  try {
    const sid = typeof sessionId === 'string' ? sessionId.trim() : '';
    if (!sid) {
      return [];
    }
    const dir = startsDir || defaultStartsDir(repoRoot);
    const filePath = startsFilePathForSession(dir, sid);
    if (!fs.existsSync(filePath)) {
      return [];
    }
    const text = fs.readFileSync(filePath, 'utf8');
    const out: Array<Record<string, unknown>> = [];
    for (const line of text.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed) {
        continue;
      }
      try {
        const parsed: unknown = JSON.parse(trimmed);
        if (isRecord(parsed)) {
          out.push(parsed);
        }
      } catch {
        // skip malformed correlation line
      }
    }
    return out;
  } catch (err) {
    logHookError('listStartsForSession failed', err);
    return [];
  }
};

/**
 * Drain resolved starts for a session. When `resolvedKeys` is provided, only
 * matching entries are removed and the rest retained; when omitted, every entry
 * is drained. The session file is unlinked once empty. Fail-open; returns the
 * count drained.
 *
 * @public
 */
export const drainStartsForSession = ({
  repoRoot,
  sessionId,
  resolvedKeys,
  startsDir,
}: {
  repoRoot: string;
  resolvedKeys?: Set<string>;
  sessionId: string | null | undefined;
  startsDir?: string;
}): number => {
  try {
    const sid = typeof sessionId === 'string' ? sessionId.trim() : '';
    if (!sid) {
      return 0;
    }
    const dir = startsDir || defaultStartsDir(repoRoot);
    const filePath = startsFilePathForSession(dir, sid);
    if (!fs.existsSync(filePath)) {
      return 0;
    }
    const entries = listStartsForSession({
      repoRoot,
      sessionId: sid,
      startsDir: dir,
    });
    if (!resolvedKeys) {
      fs.rmSync(filePath, { force: true });
      return entries.length;
    }
    const keep: Array<Record<string, unknown>> = [];
    let drained = 0;
    for (const entry of entries) {
      if (resolvedKeys.has(startCorrelationKey(entry))) {
        drained += 1;
      } else {
        keep.push(entry);
      }
    }
    if (keep.length === 0) {
      fs.rmSync(filePath, { force: true });
    } else {
      fs.writeFileSync(
        filePath,
        `${keep.map((e) => JSON.stringify(e)).join('\n')}\n`,
        'utf8',
      );
    }
    return drained;
  } catch (err) {
    logHookError('drainStartsForSession failed', err);
    return 0;
  }
};
