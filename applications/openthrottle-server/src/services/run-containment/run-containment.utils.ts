import { readFile } from 'node:fs/promises';
import { isAbsolute, join, resolve } from 'node:path';

import type {
  AgentDriver,
  DriverContainment,
} from '@openthrottle/openthrottle-drivers';
import { describeContainmentGaps } from '@openthrottle/openthrottle-drivers';
import type { PlanRunContainmentProfile } from '@openthrottle/openthrottle-plan-config';
import { getDefaultPlanRunContainmentProfile } from '@openthrottle/openthrottle-plan-config';

/**
 * @description The private git dir of a linked worktree (`<common>/.git/worktrees/<name>`), read from
 * the `gitdir:` line of its `.git` file, or `undefined` for a primary checkout (whose `.git` directory
 * is already inside the cwd) or anything unreadable.
 *
 * A linked worktree keeps its index and HEAD there, outside the worktree, so without it a contained
 * agent's `git status` cannot refresh the index. Only this worktree's dir is opened: the shared
 * object store stays read-only, so a contained worker cannot commit, which OT Loop's worker prompt
 * forbids anyway.
 */
const readWorktreeGitDir = async (cwd: string): Promise<string | undefined> => {
  let text: string;
  try {
    text = await readFile(join(cwd, '.git'), 'utf8');
  } catch {
    // A directory (primary checkout) or no `.git` at all.
    return undefined;
  }

  const match = /^gitdir:\s*(.+)$/m.exec(text);
  const gitDir = match?.[1]?.trim();
  if (gitDir === undefined || gitDir === '') {
    return undefined;
  }

  return isAbsolute(gitDir) ? gitDir : resolve(cwd, gitDir);
};

/**
 * @description The driver-level containment for one spawn in `cwd`: the run's profile (the default
 * when a job predates containment) plus the extra roots the agent must write to.
 *
 * No hosts are added for the OT API or the model provider. The CLIs' sandboxes cover the agent's
 * shell commands; the CLI's own provider traffic and the MCP servers it starts run outside them.
 */
export const buildRunContainment = async (input: {
  readonly cwd: string;
  readonly profile: PlanRunContainmentProfile | undefined;
}): Promise<DriverContainment> => {
  const profile = input.profile ?? getDefaultPlanRunContainmentProfile();
  const gitDir = await readWorktreeGitDir(input.cwd);

  return {
    extraWritableRoots: gitDir === undefined ? [] : [gitDir],
    filesystem: profile.filesystem,
    network: profile.network,
  };
};

/**
 * @description One run-start warning naming every containment axis `driver` cannot enforce, or
 * `undefined` when it enforces the whole profile. Warn, don't fail closed (maintainer decision
 * 2026-11-22): the run still goes ahead.
 */
export const describeRunContainmentWarning = (
  driver: Pick<AgentDriver, 'capabilities' | 'label'>,
  containment: DriverContainment,
): string | undefined => {
  const gaps = describeContainmentGaps(driver, containment);
  if (gaps.length === 0) {
    return undefined;
  }

  const detail = gaps
    .map((gap) => {
      return gap.message;
    })
    .join('; ');

  return `containment warning: ${detail}`;
};
