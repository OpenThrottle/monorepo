/**
 * @description Tests for the materialized-hook-task → runtime JobRunHookEntry
 * projection (validation-as-skill bridge). Covers phase derivation from
 * role + scope, onFailure defaults, skill-path resolution, and the filtering of
 * hooks that do not drive the runner (template, task-level, missing slug).
 */

import { describe, expect, it } from 'vitest';
import {
  hookTaskPhase,
  projectHookTaskToJobRunHookEntry,
  projectHookTasksToJobRunHookEntries,
  skillSlugToSkillPath,
  type MaterializedHookTask,
} from '../hook-task-to-job-run-hook';

const hookTask = (
  overrides: Partial<MaterializedHookTask> = {},
): MaterializedHookTask => ({
  hookRole: 'before',
  hookScope: 'once',
  hookSource: 'skill',
  parentTaskId: null,
  skillSlug: 'validate-plan',
  ...overrides,
});

describe('skillSlugToSkillPath', () => {
  it('resolves under the .agents/skills prefix', () => {
    expect(skillSlugToSkillPath('validate-plan')).toBe(
      '.agents/skills/validate-plan/SKILL.md',
    );
  });
});

describe('hookTaskPhase', () => {
  it('maps once → beforeAll/afterAll', () => {
    expect(
      hookTaskPhase(hookTask({ hookRole: 'before', hookScope: 'once' })),
    ).toBe('beforeAll');
    expect(
      hookTaskPhase(hookTask({ hookRole: 'after', hookScope: 'once' })),
    ).toBe('afterAll');
  });

  it('maps each → beforeEach/afterEach', () => {
    expect(
      hookTaskPhase(hookTask({ hookRole: 'before', hookScope: 'each' })),
    ).toBe('beforeEach');
    expect(
      hookTaskPhase(hookTask({ hookRole: 'after', hookScope: 'each' })),
    ).toBe('afterEach');
  });

  it('returns null for a task-level hook or a regular task', () => {
    expect(hookTaskPhase(hookTask({ parentTaskId: 'anchor' }))).toBeNull();
    expect(hookTaskPhase(hookTask({ hookRole: null }))).toBeNull();
  });
});

describe('projectHookTaskToJobRunHookEntry', () => {
  it('projects a plan-level before skill hook to a blocking beforeAll skill entry', () => {
    expect(
      projectHookTaskToJobRunHookEntry(
        hookTask({ hookRole: 'before', hookScope: 'once' }),
      ),
    ).toEqual({
      kind: 'skill',
      onFailure: 'block',
      phase: 'beforeAll',
      skillPath: '.agents/skills/validate-plan/SKILL.md',
    });
  });

  it('projects a plan-level after skill hook to a warn afterAll skill entry', () => {
    expect(
      projectHookTaskToJobRunHookEntry(
        hookTask({ hookRole: 'after', hookScope: 'once' }),
      ),
    ).toEqual({
      kind: 'skill',
      onFailure: 'warn',
      phase: 'afterAll',
      skillPath: '.agents/skills/validate-plan/SKILL.md',
    });
  });

  it('uses beforeEach/afterEach onFailure defaults for scope each', () => {
    expect(
      projectHookTaskToJobRunHookEntry(
        hookTask({ hookRole: 'before', hookScope: 'each' }),
      ),
    ).toMatchObject({ onFailure: 'block', phase: 'beforeEach' });
    expect(
      projectHookTaskToJobRunHookEntry(
        hookTask({ hookRole: 'after', hookScope: 'each' }),
      ),
    ).toMatchObject({ onFailure: 'warn', phase: 'afterEach' });
  });

  it('does not project template hooks (they run as materialized tasks)', () => {
    expect(
      projectHookTaskToJobRunHookEntry(
        hookTask({ hookSource: 'template', skillSlug: null }),
      ),
    ).toBeNull();
  });

  it('does not project task-level hooks', () => {
    expect(
      projectHookTaskToJobRunHookEntry(hookTask({ parentTaskId: 'anchor' })),
    ).toBeNull();
  });

  it('does not project a skill hook missing its slug', () => {
    expect(
      projectHookTaskToJobRunHookEntry(hookTask({ skillSlug: null })),
    ).toBeNull();
  });
});

describe('projectHookTasksToJobRunHookEntries', () => {
  it('projects drivers and drops the rest', () => {
    const entries = projectHookTasksToJobRunHookEntries([
      hookTask({ hookRole: 'before', hookScope: 'once' }),
      hookTask({ hookSource: 'template', skillSlug: null }),
      hookTask({ parentTaskId: 'anchor' }),
      hookTask({ hookRole: 'after', hookScope: 'each' }),
    ]);
    expect(entries).toHaveLength(2);
    expect(entries.map((entry) => entry.phase)).toEqual([
      'beforeAll',
      'afterEach',
    ]);
  });
});
