import { NotFoundException } from '@nestjs/common';
import type { Plan, Task } from '@openthrottle/nestjs-repositories-server';
import type {
  PlansRepository,
  TasksRepository,
} from '@openthrottle/nestjs-repositories-server';
import {
  createPlansRepositoryMock,
  createTasksRepositoryMock,
  plansFactory,
  tasksFactory,
} from '@openthrottle/nestjs-repositories-server/testing';
import { asMock } from '@openthrottle/nestjs-testing';
import { describe, expect, it } from 'vitest';

import { GitTextService } from './git-text.service.ts';

const PLAN_ID = 'ea4347bf-5cd4-42b3-9c7e-5c1662c135e2';

function service(plan: Plan | null, tasks: Task[]): GitTextService {
  const plansRepository = createPlansRepositoryMock();
  const tasksRepository = createTasksRepositoryMock();

  plansRepository.findOne.mockResolvedValue(plan);
  tasksRepository.findBy.mockResolvedValue(tasks);

  return new GitTextService(
    asMock<PlansRepository>(plansRepository),
    asMock<TasksRepository>(tasksRepository),
  );
}

const plan = plansFactory.build({
  category: 'feature',
  description: 'Why.',
  id: PLAN_ID,
  summary: null,
  title: 'Forge abstraction',
});
const task = tasksFactory.build({
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
      pullRequestTemplate: null,
      scope: 'openthrottle-server',
      taskId: 'task-1',
    });

    expect(draft.branchName).toBe('ot/forge-abstraction-ea4347bf');
    expect(draft.pullRequestTitle).toBe(
      'feat(openthrottle-server): forge abstraction',
    );
    expect(draft.commitMessage).toContain('Task-Id: task-1');
  });

  it('leaves the commit null without a task, and drops an unusable scope', async () => {
    const draft = await service(plan, [task]).draft({
      planId: PLAN_ID,
      pullRequestTemplate: null,
      scope: 'Not A Scope!',
      taskId: null,
    });

    expect(draft.commitMessage).toBeNull();
    expect(draft.pullRequestTitle).toBe('feat: forge abstraction');
  });

  it('refuses an unknown plan, and a task from another plan', async () => {
    await expect(
      service(null, []).draft({
        planId: PLAN_ID,
        pullRequestTemplate: null,
        scope: null,
        taskId: null,
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
    await expect(
      service(plan, [task]).draft({
        planId: PLAN_ID,
        pullRequestTemplate: null,
        scope: null,
        taskId: 'elsewhere',
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
