/**
 * Unreachable-endpoint warnings, rate-limited (contract §5). In a foreign repo
 * the warning lands in the host agent's captured output on every hook of every
 * prompt, so only the first failure of a session speaks; later ones buffer
 * silently. An OpenThrottle checkout keeps a warning per failure.
 *
 * Each hook is a fresh process, so "already warned" is a sentinel file under
 * the user-global telemetry dir, never in the target repo.
 */
import fs from 'node:fs';
import path from 'node:path';

import { isOpenThrottleCheckout } from '../config/env.ts';
import { resolveTelemetryDir, sanitizeSessionId } from '../data/jsonl.ts';
import { logHookError } from './logging.ts';

const WARNED_DIR_BASENAME = 'warned';
const STALE_SENTINEL_MS = 24 * 60 * 60 * 1000;
const NO_SESSION_KEY = 'no-session';

const pruneStaleSentinels = (dir: string, now: number): void => {
  for (const name of fs.readdirSync(dir)) {
    const file = path.join(dir, name);
    if (now - fs.statSync(file).mtimeMs > STALE_SENTINEL_MS) {
      fs.rmSync(file, { force: true });
    }
  }
};

/**
 * Has this foreign-repo session already warned? Claims the sentinel as a side
 * effect, so the first caller gets `false` and every later one `true`. Any
 * filesystem error answers `false` (warn rather than swallow a real fault).
 */
const claimSessionWarning = (sessionId: string | null | undefined): boolean => {
  try {
    const dir = path.join(resolveTelemetryDir(), WARNED_DIR_BASENAME);
    fs.mkdirSync(dir, { recursive: true });
    const key = sanitizeSessionId(sessionId?.trim() || NO_SESSION_KEY);
    try {
      fs.writeFileSync(path.join(dir, key), '', { flag: 'wx' });
    } catch (err) {
      if (err instanceof Error && 'code' in err && err.code === 'EEXIST') {
        return true;
      }
      throw err;
    }
    try {
      pruneStaleSentinels(dir, Date.now());
    } catch {
      // best-effort housekeeping
    }
    return false;
  } catch {
    return false;
  }
};

/** Options for {@link warnEndpointUnreachable}. @public */
export interface WarnEndpointUnreachableOptions {
  readonly message: string;
  readonly repoRoot: string;
  readonly sessionId: string | null | undefined;
}

/**
 * Log an unreachable-endpoint warning: always in an OpenThrottle checkout, once
 * per session elsewhere.
 *
 * @public
 */
export const warnEndpointUnreachable = ({
  message,
  repoRoot,
  sessionId,
}: WarnEndpointUnreachableOptions): void => {
  if (!isOpenThrottleCheckout(repoRoot) && claimSessionWarning(sessionId)) {
    return;
  }
  logHookError(message);
};
