/**
 * Per-session throttle for plan-inbox claims: at most one claim per window.
 * State is one tiny JSON file per session under the telemetry directory in the
 * user's home, never under a repo root. Fails closed: any I/O problem reports
 * "not allowed", so a broken state dir can never turn a throttle into a claim
 * per tool call.
 */
import fs from 'node:fs';
import path from 'node:path';

import { isRecord } from '@openthrottle/nodejs-utils';

import { resolveTelemetryDir, sanitizeSessionId } from '../data/jsonl.ts';

/** Default minimum gap between two claims in one session. */
export const CLAIM_THROTTLE_WINDOW_MS = 20_000;

const CLAIM_STATE_DIR_BASENAME = 'plan-inbox-claims';

/**
 * Default directory of per-session claim timestamps.
 *
 * @public
 */
export const defaultClaimStateDir = (): string => {
  return path.join(resolveTelemetryDir(), CLAIM_STATE_DIR_BASENAME);
};

export interface ClaimSlotOptions {
  /** Epoch milliseconds; injected so tests control the clock. */
  readonly nowMs: number;
  readonly sessionId: string;
  readonly stateDir: string;
  readonly windowMs: number;
}

const readLastClaimMs = (filePath: string): number | null => {
  try {
    const parsed: unknown = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    return isRecord(parsed) && typeof parsed.at === 'number' ? parsed.at : null;
  } catch {
    return null;
  }
};

/**
 * Take the session's claim slot when the window since the last claim has
 * passed, recording `nowMs` as the new last claim. Returns false when
 * throttled or when the state cannot be written.
 *
 * @public
 */
export const tryTakeClaimSlot = ({
  nowMs,
  sessionId,
  stateDir,
  windowMs,
}: ClaimSlotOptions): boolean => {
  const filePath = path.join(stateDir, `${sanitizeSessionId(sessionId)}.json`);
  const last = readLastClaimMs(filePath);
  if (last !== null && nowMs - last < windowMs) return false;
  try {
    fs.mkdirSync(stateDir, { recursive: true });
    fs.writeFileSync(filePath, JSON.stringify({ at: nowMs }));
    return true;
  } catch {
    return false;
  }
};
