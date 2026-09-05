/**
 * @description Tests for ScheduledAgentJobsResolver's per-user agent-enablement guard: a job cannot
 * be scheduled (create) or repointed (update) against an agent backend the owner disabled on
 * /settings/agents. Service-account principals (null owner) skip the guard. The service is mocked.
 */

import { createMock } from '@golevelup/ts-vitest';
import {
  AUTH_PRINCIPAL_KIND_SERVICE_ACCOUNT,
  AUTH_PRINCIPAL_KIND_USER,
  type AuthPrincipal,
} from '@openthrottle/nestjs-auth';
import type { AgentCliPreferencesService } from '@openthrottle/nestjs-repositories';
import {
  type RepositoryCheckout,
  type ScheduledAgentJob,
  type ScheduledAgentJobRun,
} from '@openthrottle/nestjs-repositories';
import type { LoggerService } from '@openthrottle/nestjs-modules';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type {
  ScheduledAgentJobObject,
  ScheduledAgentJobRunObject,
} from './scheduled-agent-job.object';
import type { ScheduledAgentJobsLoaders } from './scheduled-agent-jobs-loaders';
import {
  ScheduledAgentJobRunRepositoryResolver,
  ScheduledAgentJobsResolver,
} from './scheduled-agent-jobs.resolver';
import type { ScheduledAgentJobsGraphqlService } from './scheduled-agent-jobs-graphql.service';

const human: AuthPrincipal = { kind: AUTH_PRINCIPAL_KIND_USER, sub: 'user-1' };
const serviceAccount: AuthPrincipal = {
  kind: AUTH_PRINCIPAL_KIND_SERVICE_ACCOUNT,
  sub: 'sa-1',
};

const createInput = {
  cronPattern: '0 * * * *',
  driverId: 'cursor',
  name: 'nightly',
  prompt: 'go',
};

function build(
  enabled: boolean,
  modelEnabled = true,
): {
  create: ReturnType<typeof vi.fn>;
  isEnabled: ReturnType<typeof vi.fn>;
  isModelEnabled: ReturnType<typeof vi.fn>;
  resolver: ScheduledAgentJobsResolver;
} {
  const isEnabled = vi.fn().mockResolvedValue(enabled);
  const isModelEnabled = vi.fn().mockResolvedValue(modelEnabled);
  const agentPreferences = createMock<AgentCliPreferencesService>({
    isEnabled,
    isModelEnabled,
  });
  const create = vi
    .fn()
    .mockResolvedValue(createMock<ScheduledAgentJob>({ id: 'job-1' }));
  const service = createMock<ScheduledAgentJobsGraphqlService>({ create });
  const resolver = new ScheduledAgentJobsResolver(
    agentPreferences,
    createMock<ScheduledAgentJobsLoaders>(),
    createMock<LoggerService>(),
    service,
  );
  return { create, isEnabled, isModelEnabled, resolver };
}

describe('ScheduledAgentJobsResolver.createScheduledAgentJob', () => {
  beforeEach(() => vi.clearAllMocks());

  it('creates the job when the owner has the agent enabled', async () => {
    const { create, isEnabled, resolver } = build(true);
    await resolver.createScheduledAgentJob(human, createInput);
    expect(isEnabled).toHaveBeenCalledWith('user-1', 'cursor');
    expect(create).toHaveBeenCalledOnce();
  });

  it('rejects and never creates when the owner disabled the agent', async () => {
    const { create, resolver } = build(false);
    await expect(
      resolver.createScheduledAgentJob(human, createInput),
    ).rejects.toThrow(/cursor agent is disabled/);
    expect(create).not.toHaveBeenCalled();
  });

  it('skips the per-user guard for a service-account principal (null owner)', async () => {
    const { create, isEnabled, resolver } = build(false);
    await resolver.createScheduledAgentJob(serviceAccount, createInput);
    expect(isEnabled).not.toHaveBeenCalled();
    expect(create).toHaveBeenCalledOnce();
  });

  it('rejects and never creates when the owner disabled the targeted model', async () => {
    const { create, isModelEnabled, resolver } = build(true, false);
    await expect(
      resolver.createScheduledAgentJob(human, {
        ...createInput,
        model: 'gpt-5.2',
      }),
    ).rejects.toThrow(/gpt-5.2 model is disabled/);
    expect(isModelEnabled).toHaveBeenCalledWith('user-1', 'cursor', 'gpt-5.2');
    expect(create).not.toHaveBeenCalled();
  });
});

describe('cross-job run reads', () => {
  const runsResolver = (
    service: ScheduledAgentJobsGraphqlService,
  ): ScheduledAgentJobsResolver =>
    new ScheduledAgentJobsResolver(
      createMock<AgentCliPreferencesService>(),
      createMock<ScheduledAgentJobsLoaders>(),
      createMock<LoggerService>(),
      service,
    );

  it('scheduledAgentJobRunsInFlight passes the limit straight through and maps the rows', async () => {
    const listInFlightRuns = vi.fn().mockResolvedValue([
      createMock<ScheduledAgentJobRun>({
        id: 'run-1',
        scheduledAgentJobId: 'job-1',
        settingsSnapshot: null,
        status: 'running',
      }),
    ]);
    const resolver = runsResolver(
      createMock<ScheduledAgentJobsGraphqlService>({ listInFlightRuns }),
    );

    const runs = await resolver.scheduledAgentJobRunsInFlight(10);

    expect(listInFlightRuns).toHaveBeenCalledWith(10);
    expect(runs).toHaveLength(1);
    expect(runs[0]?.id).toBe('run-1');
  });

  it('scheduledAgentJobRunStats defaults the window to the trailing 24h', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-08-21T12:00:00.000Z'));

    const countRunsByStatusSince = vi.fn().mockResolvedValue([]);
    const countInFlightRunsByStatus = vi.fn().mockResolvedValue([]);
    const resolver = runsResolver(
      createMock<ScheduledAgentJobsGraphqlService>({
        countInFlightRunsByStatus,
        countRunsByStatusSince,
      }),
    );

    const stats = await resolver.scheduledAgentJobRunStats();

    expect(countRunsByStatusSince).toHaveBeenCalledWith(
      new Date('2026-08-20T12:00:00.000Z'),
    );
    expect(stats.since).toEqual(new Date('2026-08-20T12:00:00.000Z'));
    vi.useRealTimers();
  });

  it('scheduledAgentJobRunStats honours an explicit window and keeps no_op out of failures', async () => {
    const since = new Date('2026-08-01T00:00:00.000Z');
    const countRunsByStatusSince = vi.fn().mockResolvedValue([
      { count: 4, status: 'succeeded' },
      { count: 2, status: 'no_op' },
      { count: 1, status: 'failed' },
    ]);
    // In-flight is unwindowed, so a long-stuck run still counts.
    const countInFlightRunsByStatus = vi
      .fn()
      .mockResolvedValue([{ count: 3, status: 'running' }]);
    const resolver = runsResolver(
      createMock<ScheduledAgentJobsGraphqlService>({
        countInFlightRunsByStatus,
        countRunsByStatusSince,
      }),
    );

    const stats = await resolver.scheduledAgentJobRunStats(since);

    expect(countRunsByStatusSince).toHaveBeenCalledWith(since);
    expect(stats.failedCount).toBe(1);
    expect(stats.noOpCount).toBe(2);
    expect(stats.succeededCount).toBe(4);
    expect(stats.windowTotalCount).toBe(7);
    expect(stats.inFlightCount).toBe(3);
    expect(stats.queuedCount).toBe(0);
    expect(stats.runningCount).toBe(3);
  });
});

describe('ScheduledAgentJobRunRepositoryResolver.job', () => {
  it('labels each run with its owning schedule through the batching DataLoader', async () => {
    const loaders = createMock<ScheduledAgentJobsLoaders>();
    vi.mocked(loaders.jobLoader.load).mockImplementation((id) =>
      Promise.resolve(
        createMock<ScheduledAgentJob>({ id, name: `schedule ${id}` }),
      ),
    );
    const resolver = new ScheduledAgentJobRunRepositoryResolver(loaders);

    const jobs = await Promise.all(
      ['job-1', 'job-1', 'job-2'].map((scheduledAgentJobId) =>
        resolver.job(
          createMock<ScheduledAgentJobRunObject>({ scheduledAgentJobId }),
        ),
      ),
    );

    // Every run goes through the loader — DataLoader is what batches/dedupes, not the resolver.
    expect(loaders.jobLoader.load).toHaveBeenCalledTimes(3);
    expect(jobs.map((job) => job?.name)).toEqual([
      'schedule job-1',
      'schedule job-1',
      'schedule job-2',
    ]);
  });

  it('resolves null for a run whose schedule has since been deleted', async () => {
    const loaders = createMock<ScheduledAgentJobsLoaders>();
    vi.mocked(loaders.jobLoader.load).mockResolvedValue(null);
    const resolver = new ScheduledAgentJobRunRepositoryResolver(loaders);

    await expect(
      resolver.job(
        createMock<ScheduledAgentJobRunObject>({
          scheduledAgentJobId: 'gone',
        }),
      ),
    ).resolves.toBeNull();
  });
});

describe('repository resolve-fields', () => {
  const checkout = createMock<RepositoryCheckout>({
    displayName: 'monorepo',
    filesystemPath: '/repos/monorepo',
    id: 'checkout-1',
  });

  /** Loaders whose request-scoped checkout DataLoader resolves to `found`. */
  const loadersFor = (
    found: RepositoryCheckout | null,
  ): ScheduledAgentJobsLoaders => {
    const loaders = createMock<ScheduledAgentJobsLoaders>();
    vi.mocked(loaders.checkoutLoader.load).mockResolvedValue(found);
    return loaders;
  };

  it('labels a schedule with its targeted checkout', async () => {
    const resolver = new ScheduledAgentJobsResolver(
      createMock<AgentCliPreferencesService>(),
      loadersFor(checkout),
      createMock<LoggerService>(),
      createMock<ScheduledAgentJobsGraphqlService>(),
    );

    await expect(
      resolver.repository(
        createMock<ScheduledAgentJobObject>({
          repositoryCheckoutId: 'checkout-1',
        }),
      ),
    ).resolves.toEqual({
      displayName: 'monorepo',
      filesystemPath: '/repos/monorepo',
      id: 'checkout-1',
    });
  });

  it('resolves null for a schedule that targets no checkout', async () => {
    const loaders = loadersFor(checkout);
    const resolver = new ScheduledAgentJobsResolver(
      createMock<AgentCliPreferencesService>(),
      loaders,
      createMock<LoggerService>(),
      createMock<ScheduledAgentJobsGraphqlService>(),
    );

    await expect(
      resolver.repository(
        createMock<ScheduledAgentJobObject>({ repositoryCheckoutId: null }),
      ),
    ).resolves.toBeNull();
    expect(loaders.checkoutLoader.load).not.toHaveBeenCalled();
  });

  it('resolves null for a run whose checkout has since been deleted', async () => {
    const resolver = new ScheduledAgentJobRunRepositoryResolver(
      loadersFor(null),
    );

    await expect(
      resolver.repository(
        createMock<ScheduledAgentJobRunObject>({
          repositoryCheckoutId: 'gone',
        }),
      ),
    ).resolves.toBeNull();
  });

  it('labels a run with the checkout it targeted at fire time', async () => {
    const resolver = new ScheduledAgentJobRunRepositoryResolver(
      loadersFor(checkout),
    );

    await expect(
      resolver.repository(
        createMock<ScheduledAgentJobRunObject>({
          repositoryCheckoutId: 'checkout-1',
        }),
      ),
    ).resolves.toEqual({
      displayName: 'monorepo',
      filesystemPath: '/repos/monorepo',
      id: 'checkout-1',
    });
  });
});
