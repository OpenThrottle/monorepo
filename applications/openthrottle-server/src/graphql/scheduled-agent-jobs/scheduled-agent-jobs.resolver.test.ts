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
import {
  AgentCliPreferencesService,
  type RepositoryCheckout,
  type ScheduledAgentJob,
} from '@openthrottle/nestjs-repositories';
import { LoggerService } from '@openthrottle/nestjs-modules';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type {
  ScheduledAgentJobObject,
  ScheduledAgentJobRunObject,
} from './scheduled-agent-job.object';
import { ScheduledAgentJobsLoaders } from './scheduled-agent-jobs-loaders';
import {
  ScheduledAgentJobRunRepositoryResolver,
  ScheduledAgentJobsResolver,
} from './scheduled-agent-jobs.resolver';
import { ScheduledAgentJobsGraphqlService } from './scheduled-agent-jobs-graphql.service';

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
