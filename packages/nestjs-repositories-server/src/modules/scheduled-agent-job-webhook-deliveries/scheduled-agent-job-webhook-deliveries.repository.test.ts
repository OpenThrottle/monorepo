import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { QueryFailedError } from 'typeorm';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ScheduledAgentJobWebhookDeliveriesRepository } from './scheduled-agent-job-webhook-deliveries.repository.ts';
import type { RecordScheduledAgentJobWebhookDeliveryInput } from './scheduled-agent-job-webhook-deliveries.types.ts';
import { ScheduledAgentJobWebhookDelivery } from './scheduled-agent-job-webhook-delivery.entity.ts';

const input: RecordScheduledAgentJobWebhookDeliveryInput = {
  bodyBytes: 10,
  bodySha256: 'abc',
  dedupeKey: 'key-1',
  filterIndex: null,
  headers: {},
  httpStatus: 202,
  rejectReason: null,
  renderedPrompt: null,
  runId: null,
  scheduledAgentJobId: 'job-1',
  status: 'accepted',
  triggerId: 'trigger-1',
};

describe('ScheduledAgentJobWebhookDeliveriesRepository', () => {
  let repository: ScheduledAgentJobWebhookDeliveriesRepository;
  const typeormRepo = {
    count: vi.fn(),
    create: vi.fn((draft: object) => ({ ...draft })),
    delete: vi.fn(),
    save: vi.fn(),
    target: ScheduledAgentJobWebhookDelivery,
    update: vi.fn(),
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    const moduleRef = await Test.createTestingModule({
      providers: [
        ScheduledAgentJobWebhookDeliveriesRepository,
        {
          provide: getRepositoryToken(ScheduledAgentJobWebhookDelivery),
          useValue: typeormRepo,
        },
      ],
    }).compile();

    repository = moduleRef.get(ScheduledAgentJobWebhookDeliveriesRepository);
  });

  describe('recordDelivery', () => {
    it('returns the saved row as recorded', async () => {
      typeormRepo.save.mockResolvedValue({ id: 'd1', ...input });

      const result = await repository.recordDelivery(input);

      expect(result.kind).toBe('recorded');
    });

    it('turns a unique violation into duplicate', async () => {
      typeormRepo.save.mockRejectedValue(
        new QueryFailedError(
          'INSERT',
          [],
          Object.assign(new Error('duplicate key'), { code: '23505' }),
        ),
      );

      await expect(repository.recordDelivery(input)).resolves.toEqual({
        kind: 'duplicate',
      });
    });

    it('rethrows any other failure', async () => {
      typeormRepo.save.mockRejectedValue(new Error('boom'));

      await expect(repository.recordDelivery(input)).rejects.toThrow('boom');
    });
  });

  describe('hasDedupeKey', () => {
    it('is true when a holding row exists', async () => {
      typeormRepo.count.mockResolvedValue(1);

      await expect(repository.hasDedupeKey('trigger-1', 'key-1')).resolves.toBe(
        true,
      );
    });

    it('is false when none exists', async () => {
      typeormRepo.count.mockResolvedValue(0);

      await expect(repository.hasDedupeKey('trigger-1', 'key-1')).resolves.toBe(
        false,
      );
    });
  });

  it('attachRun points the delivery at its run', async () => {
    await repository.attachRun('d1', 'run-1');

    expect(typeormRepo.update).toHaveBeenCalledWith(
      { id: 'd1' },
      { runId: 'run-1' },
    );
  });

  it('deleteDelivery removes the row by id', async () => {
    await repository.deleteDelivery('d1');

    expect(typeormRepo.delete).toHaveBeenCalledWith({ id: 'd1' });
  });
});
