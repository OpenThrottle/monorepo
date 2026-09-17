import { execFileSync } from 'node:child_process';

/**
 * @description Derives an `org/repo` slug from the git remote. This is a small,
 * local normalizer kept independent of
 * `@openthrottle/nestjs-repositories`' `normalizeRemoteUrl` (which returns a
 * canonical full URL for stored Repository entities, not a slug, and pulls in
 * a NestJS-oriented dependency graph this read-only script does not want).
 */

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
