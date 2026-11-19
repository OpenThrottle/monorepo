import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { EvalCase } from '../eval-cases/eval-case.entity.ts';
import { EvalDataset } from './eval-dataset.entity.ts';
import { EVAL_DATASET_TARGET, EVAL_SPLIT } from './eval-datasets.constants.ts';
import { evalDatasetsFactory } from './eval-datasets.factory.ts';
import { EvalDatasetsRepository } from './eval-datasets.repository.ts';

describe('EvalDatasetsRepository', () => {
  const repositoryId = 'a1a2a3a4-0000-4000-8000-000000000001';
  const trajectoryId = 'a1a2a3a4-0000-4000-8000-000000000002';

  const txDatasets = {
    create: vi.fn(),
    findOne: vi.fn(),
    save: vi.fn(),
  };
  const txCases = { create: vi.fn(), save: vi.fn() };
  const manager = {
    getRepository: vi.fn(),
    transaction: vi.fn(),
  };
  const mockDatasetRepository = {
    find: vi.fn(),
    findOne: vi.fn(),
    manager,
    target: EvalDataset,
  };

  let repository: EvalDatasetsRepository;

  beforeAll(async () => {
    const app = await Test.createTestingModule({
      providers: [
        EvalDatasetsRepository,
        {
          provide: getRepositoryToken(EvalDataset),
          useValue: mockDatasetRepository,
        },
      ],
    }).compile();

    repository = app.get(EvalDatasetsRepository);
  });

  beforeEach(() => {
    vi.clearAllMocks();
    manager.transaction.mockImplementation(
      async (run: (m: typeof manager) => Promise<unknown>) => run(manager),
    );
    manager.getRepository.mockImplementation((entity: unknown) => {
      return entity === EvalDataset ? txDatasets : txCases;
    });
    txDatasets.create.mockImplementation((row: object) => row);
    txDatasets.save.mockImplementation(async (row: object) => {
      return { ...row, id: 'new-dataset' };
    });
    txCases.create.mockImplementation((row: object) => row);
    txCases.save.mockResolvedValue([]);
  });

  const input = {
    cases: [
      {
        gold: { passes: true },
        input: { prompt: 'x' },
        sourceTrajectoryId: trajectoryId,
        split: EVAL_SPLIT.TEST,
      },
    ],
    createdBy: 'visormatt',
    description: null,
    name: 'failures',
    repositoryId,
    target: EVAL_DATASET_TARGET.PLAN_TASK,
  };

  describe('createDataset', () => {
    it('starts a new name at version 1', async () => {
      txDatasets.findOne.mockResolvedValue(null);

      const dataset = await repository.createDataset(input);

      expect(dataset.version).toBe(1);
      expect(txDatasets.save).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'failures', version: 1 }),
      );
    });

    it('bumps an existing name to max(version) + 1', async () => {
      txDatasets.findOne.mockResolvedValue(
        evalDatasetsFactory.build({ version: 3 }),
      );

      const dataset = await repository.createDataset(input);

      expect(dataset.version).toBe(4);
    });

    it('counts soft-deleted versions so a version number is never reused', async () => {
      txDatasets.findOne.mockResolvedValue(null);

      await repository.createDataset(input);

      expect(txDatasets.findOne).toHaveBeenCalledWith({
        order: { version: 'DESC' },
        where: { name: 'failures', repositoryId },
        withDeleted: true,
      });
    });

    it('inserts every case under the new dataset in the same transaction', async () => {
      txDatasets.findOne.mockResolvedValue(null);

      await repository.createDataset(input);

      expect(manager.transaction).toHaveBeenCalledTimes(1);
      expect(manager.getRepository).toHaveBeenCalledWith(EvalCase);
      expect(txCases.save).toHaveBeenCalledWith([
        expect.objectContaining({
          datasetId: 'new-dataset',
          sourceTrajectoryId: trajectoryId,
          split: EVAL_SPLIT.TEST,
        }),
      ]);
    });
  });

  describe('findDatasetById', () => {
    it('returns the dataset', async () => {
      const row = evalDatasetsFactory.build();
      mockDatasetRepository.findOne.mockResolvedValue(row);

      await expect(repository.findDatasetById(row.id)).resolves.toBe(row);
    });

    it('returns null when missing', async () => {
      mockDatasetRepository.findOne.mockResolvedValue(null);

      await expect(repository.findDatasetById('nope')).resolves.toBeNull();
    });
  });

  describe('findByRepository', () => {
    it('lists the repository datasets newest first', async () => {
      mockDatasetRepository.find.mockResolvedValue([]);

      await repository.findByRepository(repositoryId);

      expect(mockDatasetRepository.find).toHaveBeenCalledWith({
        order: { createdAt: 'DESC', version: 'DESC' },
        where: { repositoryId },
      });
    });
  });
});
