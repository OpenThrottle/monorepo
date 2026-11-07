import { createMock } from '@golevelup/ts-vitest';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { LoggerService } from '@openthrottle/nestjs-modules';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import { EvalCase } from './eval-case.entity.ts';
import { EvalDataset } from './eval-dataset.entity.ts';
import { evalCaseFactory, evalDatasetFactory } from './eval-dataset.factory.ts';
import { EVAL_DATASET_TARGET, EVAL_SPLIT } from './eval-datasets.constants.ts';
import { EvalDatasetsService } from './eval-datasets.service.ts';

describe('EvalDatasetsService', () => {
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
  const mockDatasetRepository = { find: vi.fn(), findOne: vi.fn(), manager };
  const mockCaseRepository = { find: vi.fn() };

  let service: EvalDatasetsService;

  beforeAll(async () => {
    const app = await Test.createTestingModule({
      providers: [
        EvalDatasetsService,
        { provide: LoggerService, useValue: createMock<LoggerService>() },
        {
          provide: getRepositoryToken(EvalDataset),
          useValue: mockDatasetRepository,
        },
        {
          provide: getRepositoryToken(EvalCase),
          useValue: mockCaseRepository,
        },
      ],
    }).compile();

    service = app.get<EvalDatasetsService>(EvalDatasetsService);
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

  describe('create', () => {
    it('starts a new name at version 1', async () => {
      txDatasets.findOne.mockResolvedValue(null);

      const dataset = await service.create(input);

      expect(dataset.version).toBe(1);
      expect(txDatasets.save).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'failures', version: 1 }),
      );
    });

    it('bumps an existing name to max(version) + 1', async () => {
      txDatasets.findOne.mockResolvedValue(
        evalDatasetFactory.build({ version: 3 }),
      );

      const dataset = await service.create(input);

      expect(dataset.version).toBe(4);
    });

    it('inserts every case under the new dataset in the same transaction', async () => {
      txDatasets.findOne.mockResolvedValue(null);

      await service.create(input);

      expect(manager.transaction).toHaveBeenCalledTimes(1);
      expect(txCases.save).toHaveBeenCalledWith([
        expect.objectContaining({
          datasetId: 'new-dataset',
          sourceTrajectoryId: trajectoryId,
          split: EVAL_SPLIT.TEST,
        }),
      ]);
    });
  });

  describe('findById', () => {
    it('returns the dataset', async () => {
      const row = evalDatasetFactory.build();
      mockDatasetRepository.findOne.mockResolvedValue(row);

      await expect(service.findById(row.id)).resolves.toBe(row);
    });

    it('returns null when missing', async () => {
      mockDatasetRepository.findOne.mockResolvedValue(null);

      await expect(service.findById('nope')).resolves.toBeNull();
    });
  });

  describe('findByRepository', () => {
    it('lists the repository datasets newest first', async () => {
      mockDatasetRepository.find.mockResolvedValue([]);

      await service.findByRepository(repositoryId);

      expect(mockDatasetRepository.find).toHaveBeenCalledWith({
        order: { createdAt: 'DESC', version: 'DESC' },
        where: { repositoryId },
      });
    });
  });

  describe('findCases', () => {
    it('lists the dataset cases', async () => {
      const rows = [evalCaseFactory.build()];
      mockCaseRepository.find.mockResolvedValue(rows);

      await expect(service.findCases('d1')).resolves.toBe(rows);
      expect(mockCaseRepository.find).toHaveBeenCalledWith({
        order: { createdAt: 'ASC', id: 'ASC' },
        where: { datasetId: 'd1' },
      });
    });
  });
});
