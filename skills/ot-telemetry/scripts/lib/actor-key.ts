import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';

/**
 * @description Turns a git author email into a stable-but-non-reversible
 * `actorKey` so weekly reports dedupe by person without ever naming one. A
 * fixed namespace string is folded in ahead of the email so the digest cannot
 * be matched against a generic sha256(email) rainbow table — it is not meant
 * to resist a targeted attacker, only casual re-identification of a shared
 * report.
 */

const ACTOR_KEY_NAMESPACE = 'ot-telemetry:actor-key:v1';

/** Deterministic, one-way `actorKey` for a git email. Same email → same key, every run. */
export function hashActorEmail(email: string): string {
  const normalized = email.trim().toLowerCase();
  return createHash('sha256')
    .update(`${ACTOR_KEY_NAMESPACE}:${normalized}`)
    .digest('hex')
    .slice(0, 32);
}

/** Reads `git config user.email` in `cwd`, or `null` when git has no identity configured. */
export function readGitUserEmail(cwd: string = process.cwd()): string | null {
  try {
    const email = execFileSync('git', ['config', 'user.email'], {
      cwd,
      encoding: 'utf-8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
    return email === '' ? null : email;
  } catch {
    return null;
  }
}

/** `actorKey` for the current git identity, or `null` when no email is configured. */
export function deriveActorKey(cwd: string = process.cwd()): string | null {
  const email = readGitUserEmail(cwd);
  return email === null ? null : hashActorEmail(email);
}
