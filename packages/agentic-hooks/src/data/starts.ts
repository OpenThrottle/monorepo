/**
 * Session-scoped start-correlation store. The capture path records an
 * identifiers-only start per invocation; the completion path reads them to
 * compute duration and mark unresolved starts abandoned. All fail-open.
 */
import fs from 'node:fs';

import { isRecord, toErrorMessage } from '@openthrottle/nodejs-utils';

import { logHookError } from '../utils/logging.ts';
import {
  appendJsonl,
  defaultStartsDir,
  startCorrelationKey,
  startsFilePathForSession,
} from './jsonl.ts';

/**
 * Record a start-correlation entry (identifiers + timestamp only — NO args)
 * under `<telemetry dir>/starts/<session_id>.jsonl`. Skips (does not error)
 * when session_id or skill_name is missing.
 *
 * @public
 */
export const recordSkillStart = ({
  sessionId,
  skillName,
  toolUseId = null,
  scope = null,
  startedAt = new Date().toISOString(),
  startsDir,
}: {
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
    const dir = startsDir || defaultStartsDir();
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
      reason: toErrorMessage(err),
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
  sessionId,
  startsDir,
}: {
  sessionId: string | null | undefined;
  startsDir?: string;
}): Array<Record<string, unknown>> => {
  try {
    const sid = typeof sessionId === 'string' ? sessionId.trim() : '';
    if (!sid) {
      return [];
    }
    const dir = startsDir || defaultStartsDir();
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
  sessionId,
  resolvedKeys,
  startsDir,
}: {
  resolvedKeys?: Set<string>;
  sessionId: string | null | undefined;
  startsDir?: string;
}): number => {
  try {
    const sid = typeof sessionId === 'string' ? sessionId.trim() : '';
    if (!sid) {
      return 0;
    }
    const dir = startsDir || defaultStartsDir();
    const filePath = startsFilePathForSession(dir, sid);
    if (!fs.existsSync(filePath)) {
      return 0;
    }
    const entries = listStartsForSession({
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

/**
 * @description The started_at of an open start, in epoch ms, or null when it
 * is missing or unparseable.
 */
const startedAtMs = (entry: Record<string, unknown>): number | null => {
  const raw = entry.started_at;
  if (typeof raw !== 'string') {
    return null;
  }
  const ms = Date.parse(raw);
  return Number.isNaN(ms) ? null : ms;
};

/**
 * @description Claim a deliberate reporter's own open start: find the most
 * recent open start for `skillName` in this session, drain it, and return the
 * milliseconds from that load to `nowMs`.
 *
 * This is the one honest skill-scoped duration the harness allows. The start is
 * written when the skill is loaded; the reporter runs at the skill's own finish
 * line; nothing else the session did afterwards is counted, which is exactly
 * what the old load→session-end number got wrong. Draining the entry also stops
 * the session-end hook from emitting a second, `session_ended` row for the same
 * invocation.
 *
 * Starts stay open until the session ends (every adapter resolves them at its
 * session-end event, not at turn end), so a skill that reports several turns
 * after it loaded still gets its duration.
 *
 * Null (and nothing drained) when there is no matching start — the skill was
 * never loaded in this session, or its start was already resolved or swept —
 * or when the clock reads backwards. Fail-open.
 *
 * @public
 */
export const claimLatestStart = ({
  nowMs = Date.now(),
  sessionId,
  skillName,
  startsDir,
}: {
  readonly nowMs?: number;
  readonly sessionId: string | null;
  readonly skillName: string;
  readonly startsDir?: string;
}): number | null => {
  try {
    const matches = listStartsForSession({ sessionId, startsDir }).filter(
      (entry) => entry.skill_name === skillName && startedAtMs(entry) !== null,
    );
    const latest = matches.reduce<Record<string, unknown> | null>(
      (best, entry) => {
        if (best === null) {
          return entry;
        }
        return (startedAtMs(entry) ?? 0) > (startedAtMs(best) ?? 0)
          ? entry
          : best;
      },
      null,
    );
    if (latest === null) {
      return null;
    }
    const startMs = startedAtMs(latest);
    if (startMs === null || nowMs < startMs) {
      return null;
    }
    drainStartsForSession({
      resolvedKeys: new Set([startCorrelationKey(latest)]),
      sessionId,
      startsDir,
    });
    return nowMs - startMs;
  } catch (err) {
    logHookError('claimLatestStart failed', err);
    return null;
  }
};

/**
 * One session a deliberate reporter could be running in: the producer that
 * owns it and the id that producer exported to the shell.
 *
 * @public
 */
export interface ReporterSessionCandidate {
  readonly sessionId: string;
  readonly source: string;
}

/**
 * @description Choose which of several candidate sessions a deliberate
 * reporter belongs to.
 *
 * An agent's shell inherits its parent's environment, so a tool launched from
 * another tool's session sees both tools' session ids. Environment alone cannot
 * say which is the innermost. The start ledger can: the session that recorded
 * an open start for `skillName` is the one that loaded the skill. The first
 * candidate (in caller order) with such a start wins (`holdsStart: true`); with
 * none, the first candidate is the best guess (`holdsStart: false`); with no
 * candidates, null.
 *
 * Read-only: claiming the start is still {@link claimLatestStart}'s job.
 *
 * @public
 */
export const pickReporterSession = <
  TCandidate extends ReporterSessionCandidate,
>({
  candidates,
  skillName,
  startsDir,
}: {
  readonly candidates: readonly TCandidate[];
  readonly skillName: string;
  readonly startsDir?: string;
}): { readonly candidate: TCandidate; readonly holdsStart: boolean } | null => {
  const withStart = candidates.find((candidate) => {
    return listStartsForSession({
      sessionId: candidate.sessionId,
      startsDir,
    }).some((entry) => {
      return entry.skill_name === skillName;
    });
  });
  if (withStart) {
    return { candidate: withStart, holdsStart: true };
  }
  const [first] = candidates;
  return first ? { candidate: first, holdsStart: false } : null;
};
