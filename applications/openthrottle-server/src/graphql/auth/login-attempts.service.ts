/**
 * @description Per-account backoff for failed sign-ins.
 *
 * The throttler limits attempts per client IP; this limits them per ACCOUNT, so
 * an attacker spreading guesses across many IPs still slows to a crawl. The
 * first few failures are free (typos), then each further failure locks the
 * account for twice as long as the last, up to a ceiling. A success clears it.
 *
 * In memory, on purpose: there is one API process on the box, and a restart
 * clearing the counters costs an attacker a restart they cannot trigger. The
 * trade-off of any per-account lock is that someone who knows the email can
 * keep it locked; the ceiling bounds that, and the owner can still sign in
 * between locks.
 */

import { HttpException, HttpStatus, Injectable } from '@nestjs/common';

/**
 * Backoff schedule. Failures beyond `freeFailures` lock the account for
 * `baseLockMs × 2^(extra failures − 1)`, capped at `maxLockMs`.
 */
export const LOGIN_BACKOFF = {
  baseLockMs: 30_000,
  freeFailures: 5,
  maxLockMs: 15 * 60_000,
  /** Bound on tracked accounts, so spraying random emails cannot grow memory without limit. */
  maxTrackedAccounts: 10_000,
} as const;

interface AccountAttempts {
  readonly failures: number;
  readonly lockedUntil: number;
}

const normalizeEmail = (email: string): string => email.trim().toLowerCase();

/**
 * @description The lock that follows the given number of consecutive failures
 * (0 while still within the free failures).
 */
export const lockDurationMs = (failures: number): number => {
  const extra = failures - LOGIN_BACKOFF.freeFailures;

  if (extra <= 0) return 0;

  return Math.min(
    LOGIN_BACKOFF.baseLockMs * 2 ** (extra - 1),
    LOGIN_BACKOFF.maxLockMs,
  );
};

@Injectable()
export class LoginAttemptsService {
  private readonly accounts = new Map<string, AccountAttempts>();

  /**
   * @description Throw a 429 while the account is locked; otherwise return.
   * Call before checking the password, so a locked account does no hashing.
   */
  assertNotLocked(email: string, now: number = Date.now()): void {
    const attempts = this.accounts.get(normalizeEmail(email));
    const remainingMs = attempts ? attempts.lockedUntil - now : 0;

    if (remainingMs > 0) {
      const seconds = Math.ceil(remainingMs / 1000);

      throw new HttpException(
        `Too many failed sign-in attempts. Try again in ${seconds} seconds.`,
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
  }

  /** @description Count a failed attempt (unknown email included) and extend the lock. */
  recordFailure(email: string, now: number = Date.now()): void {
    const key = normalizeEmail(email);
    const failures = (this.accounts.get(key)?.failures ?? 0) + 1;

    // Re-insert so Map order tracks recency; evict the stalest past the bound.
    this.accounts.delete(key);
    this.accounts.set(key, {
      failures,
      lockedUntil: now + lockDurationMs(failures),
    });

    if (this.accounts.size > LOGIN_BACKOFF.maxTrackedAccounts) {
      const stalest = this.accounts.keys().next();

      if (!stalest.done) this.accounts.delete(stalest.value);
    }
  }

  /** @description Clear the account's history after a successful sign-in. */
  recordSuccess(email: string): void {
    this.accounts.delete(normalizeEmail(email));
  }
}
