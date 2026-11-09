/**
 * @description Mirrors `provision_worktree` discovery in `skills/ot-worktree/scripts/provision.sh`,
 * so the preflight can tell a worktree whose repo has a provisioner from one created bare.
 */
import { existsSync } from 'node:fs';
import { isAbsolute, join } from 'node:path';

/** Repo-relative provisioner locations, in the script's discovery order after the env override. */
const PROVISIONER_CANDIDATES = [
  '.worktree/provision.sh',
  'scripts/setup_worktree.ts',
  'scripts/setup_worktree.sh',
] as const;

/** The env var a caller sets to point at a provisioner outside the repo's conventional paths. */
const PROVISION_OVERRIDE_ENV = 'OPENTHROTTLE_WORKTREE_PROVISION';

/**
 * @description The provisioner `create.sh` would run for `worktreePath`, or null when the repo has
 * none — in which case the worktree exists but nothing (dependencies, `.env`) was installed into it.
 */
export const findWorktreeProvisioner = (
  worktreePath: string,
  env: NodeJS.ProcessEnv,
): string | null => {
  const override = env[PROVISION_OVERRIDE_ENV]?.trim() ?? '';
  const candidates = [override, ...PROVISIONER_CANDIDATES].filter(
    (candidate) => candidate !== '',
  );

  const found = candidates
    .map((candidate) => {
      return isAbsolute(candidate) ? candidate : join(worktreePath, candidate);
    })
    .find((path) => existsSync(path));

  return found ?? null;
};
