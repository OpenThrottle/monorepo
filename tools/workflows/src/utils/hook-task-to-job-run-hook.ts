/**
 * @description Bridges the materialized lifecycle-hook data model (a task row
 * carrying hook_role / hook_scope / hook_source / skill_slug — see migration 071
 * and docs/monorepo/lifecycle-hooks-design.md) to the runtime
 * {@link JobRunHookEntry} the existing {@link runJobRunHookPhase} executes.
 *
 * Per design decision D1, the materialized hook-tasks are the source of truth
 * and *drive* the runner — they are NOT a separate system. This projection is
 * that drive: a plan-level skill hook-task becomes a `kind: 'skill'` entry whose
 * phase is derived from role + scope, with the canonical onFailure default
 * (block for before*, warn for after*). Template hooks and task-level hooks are
 * NOT projected here — those run as materialized tasks in the Ralph executor
 * (before → task → after), not through the phase-based runner.
 */

import {
  defaultJobRunHookOnFailure,
  JOB_RUN_HOOK_SKILL_PATH_PREFIXES,
  type JobRunHookPhase,
  type JobRunHookSkill,
} from '../types/job-run-lifecycle-hooks';

/**
 * The hook-identity fields of a materialized task (subset of the Task entity;
 * kept local so tools/workflows need not depend on the server entity).
 */
export interface MaterializedHookTask {
  readonly hookRole: 'after' | 'before' | null;
  readonly hookScope: 'each' | 'once' | null;
  readonly hookSource: 'skill' | 'template' | null;
  readonly parentTaskId: string | null;
  readonly skillSlug: string | null;
}

/** Repo-relative prefix used to resolve a skill slug to its SKILL.md. */
const DEFAULT_SKILL_PREFIX = JOB_RUN_HOOK_SKILL_PATH_PREFIXES[0];

/**
 * @description Maps a plan-level hook's role + scope to the runtime phase:
 * scope 'each' → beforeEach/afterEach; otherwise (once) → beforeAll/afterAll.
 * Returns null when the task is not a plan-level hook.
 */
export const hookTaskPhase = (
  task: MaterializedHookTask,
): JobRunHookPhase | null => {
  if (task.parentTaskId != null || task.hookRole == null) {
    return null;
  }
  if (task.hookScope === 'each') {
    return task.hookRole === 'before' ? 'beforeEach' : 'afterEach';
  }
  return task.hookRole === 'before' ? 'beforeAll' : 'afterAll';
};

/**
 * @description Resolves a skill slug to a repo-relative SKILL.md path under the
 * default allowed prefix (`.agents/skills/<slug>/SKILL.md`).
 */
export const skillSlugToSkillPath = (skillSlug: string): string =>
  `${DEFAULT_SKILL_PREFIX}${skillSlug}/SKILL.md`;

/**
 * @description Projects a materialized hook-task into a runtime
 * {@link JobRunHookSkill} entry, or null when it does not drive the runner
 * (not plan-level, not a skill hook, missing slug/role). onFailure is set to the
 * canonical default for the resolved phase (block for before*, warn for after*).
 */
export const projectHookTaskToJobRunHookEntry = (
  task: MaterializedHookTask,
): JobRunHookSkill | null => {
  if (task.hookSource !== 'skill' || !task.skillSlug) {
    return null;
  }
  const phase = hookTaskPhase(task);
  if (phase == null) {
    return null;
  }
  return {
    kind: 'skill',
    onFailure: defaultJobRunHookOnFailure(phase),
    phase,
    skillPath: skillSlugToSkillPath(task.skillSlug),
  };
};

/**
 * @description Projects a list of materialized hook-tasks into runtime skill
 * entries, dropping any that don't drive the runner. Convenience over mapping +
 * filtering at each call site.
 */
export const projectHookTasksToJobRunHookEntries = (
  tasks: readonly MaterializedHookTask[],
): JobRunHookSkill[] =>
  tasks
    .map(projectHookTaskToJobRunHookEntry)
    .filter((entry): entry is JobRunHookSkill => entry != null);
