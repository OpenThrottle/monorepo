import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { EvalCase } from './eval-case.entity.ts';
import { evalCasesFactory } from './eval-cases.factory.ts';
import { EvalCasesRepository } from './eval-cases.repository.ts';

describe('EvalCasesRepository', () => {
  const mockRepository = { find: vi.fn(), target: EvalCase };

  let repository: EvalCasesRepository;

  beforeAll(async () => {
    const app = await Test.createTestingModule({
      providers: [
        EvalCasesRepository,
        { provide: getRepositoryToken(EvalCase), useValue: mockRepository },
      ],
    }).compile();

    repository = app.get(EvalCasesRepository);
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('findByDataset', () => {
    it('lists the dataset cases', async () => {
      const rows = [evalCasesFactory.build()];
      mockRepository.find.mockResolvedValue(rows);

      await expect(repository.findByDataset('d1')).resolves.toBe(rows);
      expect(mockRepository.find).toHaveBeenCalledWith({
        order: { createdAt: 'ASC', id: 'ASC' },
        where: { datasetId: 'd1' },
      });
    });
  });
});
