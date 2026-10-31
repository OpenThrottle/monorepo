import { beforeEach, describe, expect, test, vi } from 'vitest';

/**
 * Tests for createTask's plan-reopen rule: adding a task to a plan that is already
 * resolved (CANCELED, COMPLETED, PROMOTED, SKIPPED) puts the plan back to IN_PROGRESS.
 * The DataSource is mocked, so these exercise only the client's own branching.
 */

const { planRepo, taskRepo } = vi.hoisted(() => ({
  planRepo: { findOne: vi.fn(), save: vi.fn() },
  taskRepo: { create: vi.fn(), save: vi.fn() },
}));

vi.mock('./data-source.js', () => ({
  getOrCreateDataSource: vi.fn(async () => ({
    getRepository: (entity: { name: string }) =>
      entity.name === 'Plan' ? planRepo : taskRepo,
  })),
  runQuery: vi.fn(),
}));

const { createTask } = await import('./openthrottle-client.js');

beforeEach(() => {
  planRepo.findOne.mockReset();
  planRepo.save.mockReset();
  taskRepo.create.mockReset().mockImplementation((value: object) => value);
  taskRepo.save.mockReset().mockImplementation(async (value: object) => ({
    ...value,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
  }));
});

describe('createTask plan reopen', () => {
  test.each(['CANCELED', 'COMPLETED', 'PROMOTED', 'SKIPPED'])(
    'reopens a %s plan to IN_PROGRESS when a task is added',
    async (status) => {
      const plan = { id: 'plan-1', status };
      planRepo.findOne.mockResolvedValue(plan);

      await createTask({ planId: 'plan-1', title: 'follow-up' });

      expect(plan.status).toBe('IN_PROGRESS');
      expect(planRepo.save).toHaveBeenCalledWith(plan);
    },
  );

  test.each(['PENDING', 'IN_PROGRESS', 'BLOCKED', 'BACKLOG'])(
    'leaves a %s plan alone',
    async (status) => {
      const plan = { id: 'plan-1', status };
      planRepo.findOne.mockResolvedValue(plan);

      await createTask({ planId: 'plan-1', title: 'follow-up' });

      expect(plan.status).toBe(status);
      expect(planRepo.save).not.toHaveBeenCalled();
    },
  );
});
