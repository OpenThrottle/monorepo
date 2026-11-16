import { createMock } from '@golevelup/ts-vitest';
import { NotFoundException } from '@nestjs/common';
import type {
  Plan,
  PlansService,
  Task,
  TasksService,
} from '@openthrottle/nestjs-repositories';
import { describe, expect, it, vi } from 'vitest';

import { GitTextService } from './git-text.service.ts';

const PLAN_ID = 'ea4347bf-5cd4-42b3-9c7e-5c1662c135e2';

function service(plan: Plan | null, tasks: Task[]): GitTextService {
  return new GitTextService(
    createMock<PlansService>({
      getRepository: vi
        .fn()
        .mockReturnValue({ findOne: vi.fn().mockResolvedValue(plan) }),
    }),
    createMock<TasksService>({
      getRepository: vi
        .fn()
        .mockReturnValue({ find: vi.fn().mockResolvedValue(tasks) }),
    }),
  );
}

const plan = createMock<Plan>({
  category: 'feature',
  description: 'Why.',
  id: PLAN_ID,
  summary: null,
  title: 'Forge abstraction',
});
const task = createMock<Task>({
  category: 'refactor',
  createdAt: new Date('2026-11-01T00:00:00Z'),
  description: 'Route it.',
  id: 'task-1',
  sortOrder: 1000,
  status: 'COMPLETED',
  summary: null,
  title: 'Route the ledger',
});

describe('GitTextService', () => {
  it('drafts branch, PR and the requested task commit', async () => {
    const draft = await service(plan, [task]).draft({
      planId: PLAN_ID,
      scope: 'openthrottle-server',
      taskId: 'task-1',
    });

    expect(draft.branchName).toBe('ot/forge-abstraction-ea4347bf');
    expect(draft.pullRequestTitle).toBe(
      'feat(openthrottle-server): forge abstraction',
    );
    expect(draft.commitMessage).toContain('Task-Id: task-1');
  });

  it('leaves the commit null without a task, and defaults an unusable scope', async () => {
    const draft = await service(plan, [task]).draft({
      planId: PLAN_ID,
      scope: 'Not A Scope!',
      taskId: null,
    });

    expect(draft.commitMessage).toBeNull();
    expect(draft.pullRequestTitle.startsWith('feat(monorepo):')).toBe(true);
  });

  it('refuses an unknown plan, and a task from another plan', async () => {
    await expect(
      service(null, []).draft({ planId: PLAN_ID, scope: null, taskId: null }),
    ).rejects.toBeInstanceOf(NotFoundException);
    await expect(
      service(plan, [task]).draft({
        planId: PLAN_ID,
        scope: null,
        taskId: 'elsewhere',
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
