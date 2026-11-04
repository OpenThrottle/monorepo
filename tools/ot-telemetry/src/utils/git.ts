import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';

import { ACTOR_KEY_NAMESPACE } from '../config/index.ts';

/**
 * @description The two envelope fields read from git: `actorKey` and `repoSlug`.
 *
 * `actorKey` turns a git author email into a stable-but-non-reversible key so weekly reports
 * dedupe by person without ever naming one. The fixed {@link ACTOR_KEY_NAMESPACE} is folded in
 * ahead of the email so the digest cannot be matched against a generic sha256(email) rainbow
 * table — it is not meant to resist a targeted attacker, only casual re-identification of a
 * shared report.
 *
 * `repoSlug` is an `org/repo` slug from the git remote. It is a small, local normalizer kept
 * independent of `@openthrottle/nestjs-repositories`' `normalizeRemoteUrl` (which returns a
 * canonical full URL for stored Repository entities, not a slug, and pulls in a NestJS-oriented
 * dependency graph this read-only tool does not want).
 */

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

/** Extracts `org/repo` from a git remote URL (ssh shorthand, ssh://, http(s)://, with or without `.git`). */
export function slugFromRemoteUrl(raw: string): string | null {
  const trimmed = raw.trim();
  if (trimmed === '') return null;

  const withoutGitSuffix = trimmed.replace(/\.git$/, '');

  const scpMatch = /^git@[^:]+:(.+)$/.exec(withoutGitSuffix);
  const path =
    scpMatch?.[1] ??
    (() => {
      try {
        return new URL(withoutGitSuffix).pathname.replace(/^\/+/, '');
      } catch {
        return null;
      }
    })();

  if (!path) return null;

  const segments = path.split('/').filter(Boolean);
  if (segments.length < 2) return null;

  const org = segments[segments.length - 2];
  const repo = segments[segments.length - 1];
  return org && repo ? `${org}/${repo}` : null;
}

/** Reads `git remote get-url origin` in `cwd`, or `null` when there is no such remote (local-only repo). */
export function readGitRemoteUrl(
  cwd: string = process.cwd(),
  remote = 'origin',
): string | null {
  try {
    const url = execFileSync('git', ['remote', 'get-url', remote], {
      cwd,
      encoding: 'utf-8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
    return url === '' ? null : url;
  } catch {
    return null;
  }
}

/** `org/repo` for the current repo's `origin` remote, or `null` when there is none. */
export function deriveRepoSlug(cwd: string = process.cwd()): string | null {
  const remoteUrl = readGitRemoteUrl(cwd);
  return remoteUrl === null ? null : slugFromRemoteUrl(remoteUrl);
}
