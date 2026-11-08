import type { RepeatablesOwnership } from './repeatable-job.types.ts';

export const resolveRepeatablesOwner = (): RepeatablesOwnership => {
  const explicit = process.env.OT_SCHEDULED_JOBS_OWNER?.trim().toLowerCase();
  if (explicit === 'true' || explicit === '1') {
    return { owner: true, reason: 'OT_SCHEDULED_JOBS_OWNER is set true' };
  }
  if (explicit === 'false' || explicit === '0') {
    return { owner: false, reason: 'OT_SCHEDULED_JOBS_OWNER is set false' };
  }

  const worktreeDb = process.env.OT_WORKTREE_DB?.trim().toLowerCase();
  if (worktreeDb === 'shared') {
    return {
      owner: false,
      reason: `OT_WORKTREE_DB=shared: this worktree shares the primary database, so only the primary registers repeatables (set OT_SCHEDULED_JOBS_OWNER=true to override)`,
    };
  }
  if (worktreeDb === 'isolated') {
    return {
      owner: true,
      reason: 'OT_WORKTREE_DB=isolated: this worktree owns its own database',
    };
  }

  return { owner: true, reason: 'canonical checkout' };
};
