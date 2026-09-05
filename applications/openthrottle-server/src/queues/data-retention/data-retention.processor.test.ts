import { createMock } from '@golevelup/ts-vitest';
import type { LoggerService } from '@openthrottle/nestjs-modules';
import type { DataSource } from 'typeorm';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DATA_RETENTION_BATCH_SIZE } from './data-retention.constants';
import { DataRetentionProcessor } from './data-retention.processor';
import type { DataRetentionJob, RetentionPolicy } from './data-retention.types';

/**
 * The processor reads enforcement from the environment on every run, so each test
 * sets DATA_RETENTION_ENFORCE explicitly rather than relying on ambient state.
 */
describe('DataRetentionProcessor', () => {
  const job = createMock<DataRetentionJob>({ id: 'retention-1' });

  let dataSource: DataSource;

  const makePolicy = (
    overrides: Partial<RetentionPolicy> = {},
  ): RetentionPolicy => ({
    countExpired: vi.fn().mockResolvedValue(0),
    deleteBatch: vi.fn().mockResolvedValue(0),
    description: 'test policy',
    name: 'test',
    table: 'test_table',
    ...overrides,
  });

  const makeProcessor = (
    policies: readonly RetentionPolicy[],
  ): DataRetentionProcessor =>
    new DataRetentionProcessor(
      dataSource,
      createMock<LoggerService>(),
      policies,
    );

  beforeEach(() => {
    dataSource = createMock<DataSource>();
    delete process.env.DATA_RETENTION_ENFORCE;
  });

  afterEach(() => {
    delete process.env.DATA_RETENTION_ENFORCE;
  });

  it('counts but never deletes when enforcement is off', async () => {
    const policy = makePolicy({ countExpired: vi.fn().mockResolvedValue(42) });

    await makeProcessor([policy]).process(job);

    expect(policy.countExpired).toHaveBeenCalledWith(dataSource);
    expect(policy.deleteBatch).not.toHaveBeenCalled();
  });

  it.each([['1'], ['yes'], [''], ['false']])(
    'stays in dry-run mode for DATA_RETENTION_ENFORCE=%j',
    async (value) => {
      process.env.DATA_RETENTION_ENFORCE = value;
      const policy = makePolicy({ countExpired: vi.fn().mockResolvedValue(5) });

      await makeProcessor([policy]).process(job);

      expect(policy.deleteBatch).not.toHaveBeenCalled();
    },
  );

  it('treats a padded, mixed-case "true" as enforcing', async () => {
    process.env.DATA_RETENTION_ENFORCE = ' TRUE ';
    const policy = makePolicy({
      countExpired: vi.fn().mockResolvedValue(3),
      deleteBatch: vi.fn().mockResolvedValue(3),
    });

    await makeProcessor([policy]).process(job);

    expect(policy.deleteBatch).toHaveBeenCalledWith(
      dataSource,
      DATA_RETENTION_BATCH_SIZE,
    );
  });

  it('deletes in batches until a short batch drains the backlog', async () => {
    process.env.DATA_RETENTION_ENFORCE = 'true';
    const deleteBatch = vi
      .fn()
      .mockResolvedValueOnce(DATA_RETENTION_BATCH_SIZE)
      .mockResolvedValueOnce(DATA_RETENTION_BATCH_SIZE)
      .mockResolvedValueOnce(7);

    await makeProcessor([
      makePolicy({
        countExpired: vi
          .fn()
          .mockResolvedValue(DATA_RETENTION_BATCH_SIZE * 2 + 7),
        deleteBatch,
      }),
    ]).process(job);

    expect(deleteBatch).toHaveBeenCalledTimes(3);
  });

  it('stops at the per-policy batch cap instead of deleting without bound', async () => {
    process.env.DATA_RETENTION_ENFORCE = 'true';
    // Always returns a full batch, so only the cap can end the loop.
    const deleteBatch = vi.fn().mockResolvedValue(DATA_RETENTION_BATCH_SIZE);

    await makeProcessor([
      makePolicy({
        countExpired: vi.fn().mockResolvedValue(10_000_000),
        deleteBatch,
      }),
    ]).process(job);

    expect(deleteBatch).toHaveBeenCalledTimes(50);
  });

  it('skips deleting entirely when nothing is past retention', async () => {
    process.env.DATA_RETENTION_ENFORCE = 'true';
    const policy = makePolicy({ countExpired: vi.fn().mockResolvedValue(0) });

    await makeProcessor([policy]).process(job);

    expect(policy.deleteBatch).not.toHaveBeenCalled();
  });

  it('keeps sweeping the remaining policies when one throws', async () => {
    process.env.DATA_RETENTION_ENFORCE = 'true';
    const healthy = makePolicy({
      countExpired: vi.fn().mockResolvedValue(3),
      deleteBatch: vi.fn().mockResolvedValue(3),
      name: 'healthy',
    });
    const broken = makePolicy({
      countExpired: vi.fn().mockRejectedValue(new Error('relation missing')),
      name: 'broken',
    });

    await expect(
      makeProcessor([broken, healthy]).process(job),
    ).resolves.toBeUndefined();
    expect(healthy.deleteBatch).toHaveBeenCalled();
  });
});
