import { createMock } from '@golevelup/ts-vitest';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import type { EntityManager, Repository } from 'typeorm';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { WorkArtifact } from './work-artifact.entity.ts';
import { WORK_LEDGER_PLAN_COMPLETENESS_SQL } from './work-artifacts.constants.ts';
import { WorkArtifactsRepository } from './work-artifacts.repository.ts';
import type { WorkLedgerPlanCompletenessRow } from './work-artifacts.types.ts';

describe('WorkArtifactsRepository', () => {
  let repository: WorkArtifactsRepository;
  const query = vi.fn();

  beforeEach(async () => {
    vi.clearAllMocks();
    const app = await Test.createTestingModule({
      providers: [
        WorkArtifactsRepository,
        {
          provide: getRepositoryToken(WorkArtifact),
          useValue: createMock<Repository<WorkArtifact>>({
            manager: createMock<EntityManager>({ query }),
            target: WorkArtifact,
          }),
        },
      ],
    }).compile();
    repository = app.get(WorkArtifactsRepository);
  });

  describe('listPlanCompleteness', () => {
    it('runs the completeness query and returns its rows', async () => {
      const rows: WorkLedgerPlanCompletenessRow[] = [
        {
          artifactCount: 2,
          planId: 'plan-1',
          planStatus: 'COMPLETED',
          planTitle: 'Plan',
          recorded: false,
        },
      ];
      query.mockResolvedValue(rows);

      await expect(repository.listPlanCompleteness()).resolves.toBe(rows);
      expect(query).toHaveBeenCalledWith(WORK_LEDGER_PLAN_COMPLETENESS_SQL);
    });

    it('reads live plans only, since plans soft delete', async () => {
      query.mockResolvedValue([]);

      await repository.listPlanCompleteness();

      expect(query.mock.calls[0]?.[0]).toContain(
        'JOIN plans p ON p.id = g.plan_id AND p.deleted_at IS NULL',
      );
    });
  });
});
