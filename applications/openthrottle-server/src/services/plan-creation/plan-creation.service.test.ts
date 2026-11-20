import { createMock } from '@golevelup/ts-vitest';
import { BadRequestException } from '@nestjs/common';
import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { LoggerService } from '@openthrottle/nestjs-modules';
import type { Plan, PlanData } from '@openthrottle/nestjs-repositories-server';
import {
  PlansRepository,
  UserDisabledAgentClisRepository,
  UserPreferencesRepository,
} from '@openthrottle/nestjs-repositories-server';
import {
  createPlansRepositoryMock,
  createUserDisabledAgentClisRepositoryMock,
  plansFactory,
} from '@openthrottle/nestjs-repositories-server/testing';
import { asMock } from '@openthrottle/nestjs-testing';
import type { PlanRunConfigStorage } from '@openthrottle/openthrottle-plan-config';
import { getDefaultPlanRunConfigStorage } from '@openthrottle/openthrottle-plan-config';
import { DataSource } from 'typeorm';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { CreatePlanInput } from '../../graphql/plans/plan.input.ts';
import { CheckoutPathResolutionService } from '../checkout-path-resolution/checkout-path-resolution.service.ts';
import { EffectiveUserResolutionService } from '../effective-user-resolution/effective-user-resolution.service.ts';
import { PlanProjectMembershipService } from '../plan-project-membership/plan-project-membership.service.ts';
import { PlanCreationService } from './plan-creation.service.ts';

const FIXED_NOW = new Date('2026-01-15T12:00:00.000Z');

describe('PlanCreationService', () => {
  let service: PlanCreationService;
  const resolveCheckoutForPath = vi.fn();
  const resolveEffectiveUserId = vi.fn();
  const getForUser = vi.fn();
  const isEnabled = vi.fn();
  const isModelEnabled = vi.fn();
  const plansRepository = createPlansRepositoryMock();
  const appendSortOrder = vi.fn();
  const appendSortOrders = vi.fn();
  const linkPlanRepository = vi.fn();
  const linkPlanRepositories = vi.fn();
  // The TypeORM repository a batch create's transaction manager hands out.
  const planRepo = {
    create: vi.fn(),
    manager: {
      transaction: vi.fn(
        (run: (manager: { getRepository: () => unknown }) => unknown) =>
          run({ getRepository: () => planRepo }),
      ),
    },
    save: vi.fn(),
  };
  const dataSource = asMock<DataSource>({
    transaction: planRepo.manager.transaction,
  });

  beforeEach(async () => {
    vi.clearAllMocks();
    resolveCheckoutForPath.mockResolvedValue(null);
    // Default: a user sub acts as itself (the human-JWT case).
    resolveEffectiveUserId.mockImplementation(async (sub: string) => sub);
    // Default: no saved preference, every agent and model enabled.
    getForUser.mockImplementation(async (userId: string) => ({
      defaultAgent: null,
      defaultEditor: null,
      userId,
    }));
    isEnabled.mockResolvedValue(true);
    isModelEnabled.mockResolvedValue(true);
    // Default: an empty project, so the first plan lands on 1000 and a batch counts up from there.
    appendSortOrder.mockImplementation(async (projectId: string | null) => {
      return projectId === null ? null : 1000;
    });
    appendSortOrders.mockImplementation(
      async (projectIds: readonly (string | null)[]) => {
        return projectIds.map((projectId, index) => {
          return projectId === null ? null : (index + 1) * 1000;
        });
      },
    );
    linkPlanRepository.mockResolvedValue(undefined);
    linkPlanRepositories.mockResolvedValue(undefined);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PlanCreationService,
        {
          provide: CheckoutPathResolutionService,
          useValue: { resolveCheckoutForPath },
        },
        {
          provide: EffectiveUserResolutionService,
          useValue: { resolveEffectiveUserId },
        },
        {
          provide: LoggerService,
          useValue: createMock<LoggerService>(),
        },
        {
          provide: UserDisabledAgentClisRepository,
          useValue: {
            ...createUserDisabledAgentClisRepositoryMock(),
            isEnabled,
            isModelEnabled,
          },
        },
        {
          provide: UserPreferencesRepository,
          useValue: { getForUser },
        },
        {
          provide: PlanProjectMembershipService,
          useValue: {
            appendSortOrder,
            appendSortOrders,
            linkPlanRepositories,
            linkPlanRepository,
          },
        },
        { provide: PlansRepository, useValue: plansRepository },
        { provide: DataSource, useValue: dataSource },
      ],
    }).compile();

    service = module.get<PlanCreationService>(PlanCreationService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('throws when title is empty', async () => {
    const input: CreatePlanInput = {
      assignee: null,
      author: 'visormatt',
      category: 'feature',
      description: null,
      project: null,
      projectId: null,
      status: null,
      summary: null,
      title: '   ',
    };

    await expect(service.createPlanFromInput(input)).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('throws when category is empty', async () => {
    const input: CreatePlanInput = {
      assignee: null,
      author: 'visormatt',
      category: ' ',
      description: null,
      project: null,
      projectId: null,
      status: null,
      summary: null,
      title: 'T',
    };

    await expect(service.createPlanFromInput(input)).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });

  it('throws when author empty and GITHUB_USER unset', async () => {
    const prev = process.env.GITHUB_USER;
    delete process.env.GITHUB_USER;
    const input: CreatePlanInput = {
      assignee: null,
      author: '  ',
      category: 'feature',
      description: null,
      project: null,
      projectId: null,
      status: null,
      summary: null,
      title: 'My plan',
    };

    try {
      await expect(service.createPlanFromInput(input)).rejects.toBeInstanceOf(
        BadRequestException,
      );
    } finally {
      if (prev !== undefined) {
        process.env.GITHUB_USER = prev;
      } else {
        delete process.env.GITHUB_USER;
      }
    }
  });

  describe('when the input carries a client id', () => {
    const CLIENT_ID = '0b9a4a0e-8a3e-4c1e-9f0a-2f6d1f4b7c11';

    const plan = (title: string): Plan => {
      return plansFactory.build({
        assignee: null,
        author: 'visormatt',
        category: 'feature',
        completedAt: null,
        createdAt: new Date(FIXED_NOW),
        description: 'body',
        id: CLIENT_ID,
        project: null,
        projectId: null,
        status: 'PENDING',
        summary: null,
        title,
        updatedAt: new Date(FIXED_NOW),
      });
    };

    const input = (id: string): CreatePlanInput => {
      return {
        assignee: null,
        author: 'visormatt',
        category: 'feature',
        description: 'body',
        id,
        project: null,
        projectId: null,
        status: null,
        summary: null,
        title: 'My plan',
      };
    };

    it('inserts the plan under that id when it is new', async () => {
      plansRepository.findOne.mockResolvedValue(null);
      plansRepository.create.mockImplementation(async (fields) => {
        return plansFactory.build(fields);
      });

      const result = await service.createPlanFromInput(input(CLIENT_ID));

      expect(result).toMatchObject({ id: CLIENT_ID, title: 'My plan' });
      expect(plansRepository.create).toHaveBeenCalledTimes(1);
    });

    it('returns the plan an earlier call created instead of inserting again', async () => {
      plansRepository.findOne.mockResolvedValue(plan('My plan'));

      const result = await service.createPlanFromInput(
        input(CLIENT_ID.toUpperCase()),
      );

      expect(result.id).toBe(CLIENT_ID);
      expect(plansRepository.findOne).toHaveBeenCalledWith({
        where: { id: CLIENT_ID },
      });
      expect(plansRepository.create).not.toHaveBeenCalled();
    });

    it('returns the winner when a concurrent replay inserted first', async () => {
      plansRepository.findOne
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(plan('My plan'));
      plansRepository.create.mockRejectedValue(
        Object.assign(new Error('duplicate key'), { code: '23505' }),
      );

      await expect(
        service.createPlanFromInput(input(CLIENT_ID)),
      ).resolves.toMatchObject({ id: CLIENT_ID });
    });

    it('refuses an id that already belongs to a plan with another title', async () => {
      plansRepository.findOne.mockResolvedValue(plan('Someone else'));

      await expect(
        service.createPlanFromInput(input(CLIENT_ID)),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(plansRepository.create).not.toHaveBeenCalled();
    });

    it('refuses an id that is not a UUID', async () => {
      await expect(
        service.createPlanFromInput(input('not-a-uuid')),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(plansRepository.findOne).not.toHaveBeenCalled();
    });
  });

  it('uses GITHUB_USER when author omitted', async () => {
    const prev = process.env.GITHUB_USER;
    process.env.GITHUB_USER = 'fromenv';

    const saved: PlanData = {
      assignee: null,
      author: 'fromenv',
      category: 'feature',
      completedAt: null,
      createdAt: new Date(FIXED_NOW),
      description: null,
      id: 'p1',
      project: null,
      projectId: null,
      status: 'PENDING',
      summary: null,
      title: 'My plan',
      updatedAt: new Date(FIXED_NOW),
    };

    plansRepository.create.mockResolvedValue(plansFactory.build(saved));

    const input: CreatePlanInput = {
      assignee: null,
      author: '',
      category: 'feature',
      description: null,
      project: null,
      projectId: null,
      status: null,
      summary: null,
      title: 'My plan',
    };

    try {
      const result = await service.createPlanFromInput(input);

      expect(result.author).toBe('fromenv');
      expect(plansRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ author: 'fromenv', title: 'My plan' }),
      );
    } finally {
      if (prev !== undefined) {
        process.env.GITHUB_USER = prev;
      } else {
        delete process.env.GITHUB_USER;
      }
    }
  });

  it('persists default runConfig when runConfigJson is omitted', async () => {
    const saved: PlanData = {
      assignee: null,
      author: 'visormatt',
      category: 'feature',
      completedAt: null,
      createdAt: new Date(FIXED_NOW),
      description: null,
      id: 'p-run-config',
      project: null,
      projectId: null,
      status: 'PENDING',
      summary: null,
      title: 'Plan',
      updatedAt: new Date(FIXED_NOW),
    };

    plansRepository.create.mockResolvedValue(plansFactory.build(saved));

    const input: CreatePlanInput = {
      assignee: null,
      author: 'visormatt',
      category: 'feature',
      description: null,
      project: null,
      projectId: null,
      runConfigJson: null,
      status: null,
      summary: null,
      title: 'Plan',
    };

    await service.createPlanFromInput(input);

    expect(plansRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        runConfig: getDefaultPlanRunConfigStorage(),
      }),
    );
  });

  it('stores null assignee when input is not a valid GitHub login', async () => {
    const saved: PlanData = {
      assignee: null,
      author: 'visormatt',
      category: 'feature',
      completedAt: null,
      createdAt: new Date(FIXED_NOW),
      description: null,
      id: 'p2',
      project: null,
      projectId: null,
      status: 'PENDING',
      summary: null,
      title: 'Plan',
      updatedAt: new Date(FIXED_NOW),
    };

    plansRepository.create.mockResolvedValue(plansFactory.build(saved));

    const input: CreatePlanInput = {
      assignee: 'not-a-github!!!',
      author: 'visormatt',
      category: 'feature',
      description: null,
      project: null,
      projectId: null,
      status: null,
      summary: null,
      title: 'Plan',
    };

    await service.createPlanFromInput(input);

    expect(plansRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({ assignee: null }),
    );
  });

  describe('createPlansFromInput', () => {
    const validInput = (title: string): CreatePlanInput => {
      return {
        assignee: null,
        author: 'visormatt',
        category: 'feature',
        description: null,
        project: null,
        projectId: null,
        runConfigJson: null,
        status: null,
        summary: null,
        title,
      };
    };

    it('returns empty without a transaction when no inputs are given', async () => {
      const result = await service.createPlansFromInput([]);

      expect(result).toEqual([]);
      expect(planRepo.manager.transaction).not.toHaveBeenCalled();
    });

    it('creates every plan in one transaction with a single batched save', async () => {
      planRepo.create.mockImplementation((fields: unknown) => fields);
      planRepo.save.mockImplementation((entities: unknown) =>
        Promise.resolve(entities),
      );

      const result = await service.createPlansFromInput([
        validInput('A'),
        validInput('B'),
      ]);

      expect(planRepo.manager.transaction).toHaveBeenCalledTimes(1);
      expect(planRepo.save).toHaveBeenCalledTimes(1);
      expect(result.map((plan) => plan.title)).toEqual(['A', 'B']);
    });

    it('throws before opening a transaction when any input is invalid', async () => {
      await expect(
        service.createPlansFromInput([validInput('ok'), validInput('   ')]),
      ).rejects.toBeInstanceOf(BadRequestException);

      expect(planRepo.manager.transaction).not.toHaveBeenCalled();
      expect(planRepo.save).not.toHaveBeenCalled();
    });
  });

  describe('project membership', () => {
    const PROJECT = '7c1f6f0e-2f5e-4b87-9a52-3d9a1d4b6c11';
    const projectInput = (
      title: string,
      projectId: string | null,
    ): CreatePlanInput => {
      return {
        assignee: null,
        author: 'visormatt',
        category: 'feature',
        description: null,
        project: null,
        projectId,
        runConfigJson: null,
        status: null,
        summary: null,
        title,
      };
    };

    it('appends a new plan to the end of its project and links its repository', async () => {
      appendSortOrder.mockResolvedValue(4000);
      const created = plansFactory.build({ projectId: PROJECT });
      plansRepository.create.mockResolvedValue(created);

      const plan = await service.createPlanFromInput(
        projectInput('In project', PROJECT),
      );

      expect(appendSortOrder).toHaveBeenCalledWith(PROJECT);
      expect(plansRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ projectId: PROJECT, projectSortOrder: 4000 }),
      );
      expect(linkPlanRepository).toHaveBeenCalledWith(created);
      expect(plan).toBe(created);
    });

    it('gives a plan with no project no position', async () => {
      plansRepository.create.mockResolvedValue(plansFactory.build());

      await service.createPlanFromInput(projectInput('Loose', null));

      expect(plansRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ projectId: null, projectSortOrder: null }),
      );
    });

    it('numbers a batch per plan from one shared read and links their repositories after the save', async () => {
      planRepo.create.mockImplementation((fields: unknown) => fields);
      planRepo.save.mockImplementation((entities: unknown) =>
        Promise.resolve(entities),
      );

      await service.createPlansFromInput([
        projectInput('A', PROJECT),
        projectInput('B', null),
        projectInput('C', PROJECT),
      ]);

      expect(appendSortOrders).toHaveBeenCalledWith(
        [PROJECT, null, PROJECT],
        expect.anything(),
      );
      expect(
        planRepo.create.mock.calls.map(([fields]) => {
          return fields.projectSortOrder;
        }),
      ).toEqual([1000, null, 3000]);
      expect(linkPlanRepositories).toHaveBeenCalledTimes(1);
    });
  });

  describe('workspacePath', () => {
    const RESOLVED = {
      checkoutId: '11111111-1111-4111-8111-111111111111',
      repositoryId: '22222222-2222-4222-8222-222222222222',
    };
    const WORKSPACE = '/Users/matt/Development/openthrottle';
    const USER = 'user-1';

    /** Only the fields these assertions read; the rest of the input stays at its defaults. */
    const input = (
      overrides: Partial<CreatePlanInput> = {},
    ): CreatePlanInput => {
      return {
        assignee: null,
        author: 'visormatt',
        category: 'feature',
        description: null,
        project: null,
        projectId: null,
        status: null,
        summary: null,
        title: 'Plan',
        ...overrides,
      };
    };

    /** Asserts the `workspace` block the service actually handed to the repository. */
    const expectWorkspace = (
      nth: number,
      expected: Partial<PlanRunConfigStorage['workspace']>,
    ): void => {
      expect(plansRepository.create).toHaveBeenNthCalledWith(
        nth,
        expect.objectContaining({
          runConfig: expect.objectContaining({
            workspace: expect.objectContaining(expected),
          }),
        }),
      );
    };

    beforeEach(() => {
      plansRepository.create.mockImplementation(async (fields) => {
        return plansFactory.build(fields);
      });
    });

    it('seeds checkoutId and repositoryId when the path resolves and the run config is empty', async () => {
      resolveCheckoutForPath.mockResolvedValue(RESOLVED);

      await service.createPlanFromInput(
        input({ workspacePath: WORKSPACE }),
        USER,
      );

      expect(resolveCheckoutForPath).toHaveBeenCalledWith({
        path: WORKSPACE,
        userId: USER,
      });
      expectWorkspace(1, RESOLVED);
    });

    it('never overrides a runConfigJson that already names a workspace', async () => {
      resolveCheckoutForPath.mockResolvedValue(RESOLVED);
      const explicit = {
        ...getDefaultPlanRunConfigStorage(),
        workspace: {
          checkoutId: '33333333-3333-4333-8333-333333333333',
          repositoryId: '',
          workingDirectory: '',
        },
      };

      await service.createPlanFromInput(
        input({
          runConfigJson: JSON.stringify(explicit),
          workspacePath: WORKSPACE,
        }),
        USER,
      );

      expect(resolveCheckoutForPath).not.toHaveBeenCalled();
      expectWorkspace(1, {
        checkoutId: '33333333-3333-4333-8333-333333333333',
      });
    });

    it('leaves the run config untouched when the path resolves to nothing', async () => {
      resolveCheckoutForPath.mockResolvedValue(null);

      await service.createPlanFromInput(
        input({ workspacePath: '/not/registered' }),
        USER,
      );

      expectWorkspace(1, { checkoutId: '', repositoryId: '' });
    });

    it('does not attempt resolution when workspacePath is absent', async () => {
      await service.createPlanFromInput(input(), USER);

      expect(resolveCheckoutForPath).not.toHaveBeenCalled();
      expectWorkspace(1, { checkoutId: '' });
    });

    it('does not attempt resolution when there is no authenticated user', async () => {
      await service.createPlanFromInput(input({ workspacePath: WORKSPACE }));

      expect(resolveCheckoutForPath).not.toHaveBeenCalled();
      expectWorkspace(1, { checkoutId: '' });
    });

    it('seeds via the acting user when the sub is a linked service account', async () => {
      const serviceAccountSub = 'sa-1';
      const actingUserId = 'user-linked';
      resolveEffectiveUserId.mockResolvedValue(actingUserId);
      resolveCheckoutForPath.mockResolvedValue(RESOLVED);

      await service.createPlanFromInput(
        input({ workspacePath: WORKSPACE }),
        serviceAccountSub,
      );

      expect(resolveEffectiveUserId).toHaveBeenCalledWith(serviceAccountSub);
      expect(resolveCheckoutForPath).toHaveBeenCalledWith({
        path: WORKSPACE,
        userId: actingUserId,
      });
      expectWorkspace(1, RESOLVED);
    });

    it('leaves the run config untouched when the sub resolves to no user', async () => {
      resolveEffectiveUserId.mockResolvedValue(null);

      await service.createPlanFromInput(
        input({ workspacePath: WORKSPACE }),
        'sa-unlinked',
      );

      expect(resolveCheckoutForPath).not.toHaveBeenCalled();
      expectWorkspace(1, { checkoutId: '', repositoryId: '' });
    });

    it('still creates the plan when effective-user resolution throws', async () => {
      resolveEffectiveUserId.mockRejectedValue(new Error('boom'));

      const plan = await service.createPlanFromInput(
        input({ workspacePath: WORKSPACE }),
        USER,
      );

      expect(plan).toBeDefined();
      expectWorkspace(1, { checkoutId: '' });
    });

    it('still creates the plan when resolution throws', async () => {
      resolveCheckoutForPath.mockRejectedValue(new Error('boom'));

      const plan = await service.createPlanFromInput(
        input({ workspacePath: WORKSPACE }),
        USER,
      );

      expect(plan).toBeDefined();
      expectWorkspace(1, { checkoutId: '' });
    });

    it('seeds every plan in a batch create', async () => {
      resolveCheckoutForPath.mockResolvedValue(RESOLVED);
      planRepo.create.mockImplementation((fields: unknown) => fields);
      planRepo.save.mockImplementation((entities: unknown) =>
        Promise.resolve(entities),
      );

      await service.createPlansFromInput(
        [
          input({ title: 'A', workspacePath: WORKSPACE }),
          input({ title: 'B', workspacePath: WORKSPACE }),
        ],
        USER,
      );

      for (const nth of [1, 2]) {
        expect(planRepo.create).toHaveBeenNthCalledWith(
          nth,
          expect.objectContaining({
            runConfig: expect.objectContaining({
              workspace: expect.objectContaining(RESOLVED),
            }),
          }),
        );
      }
    });
  });

  describe('default agent', () => {
    const USER = 'user-1';
    const AGENT = { backend: 'claude', effort: 'high', model: 'opus' };

    const input = (
      overrides: Partial<CreatePlanInput> = {},
    ): CreatePlanInput => {
      return {
        assignee: null,
        author: 'visormatt',
        category: 'feature',
        description: null,
        project: null,
        projectId: null,
        status: null,
        summary: null,
        title: 'Plan',
        ...overrides,
      };
    };

    const expectRalph = (
      expected: Partial<PlanRunConfigStorage['ralph']>,
    ): void => {
      expect(plansRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          runConfig: expect.objectContaining({
            ralph: expect.objectContaining(expected),
          }),
        }),
      );
    };

    const systemRalph = getDefaultPlanRunConfigStorage().ralph;
    const systemAgent = {
      effort: systemRalph.effort,
      executionBackend: systemRalph.executionBackend,
      model: systemRalph.model,
    };

    beforeEach(() => {
      plansRepository.create.mockImplementation(async (fields) => {
        return plansFactory.build(fields);
      });
    });

    it('keeps the system default when the user has no preference', async () => {
      await service.createPlanFromInput(input(), USER);

      expect(getForUser).toHaveBeenCalledWith(USER);
      expectRalph(systemAgent);
    });

    it('stamps the user default agent, model and effort', async () => {
      getForUser.mockResolvedValue({
        defaultAgent: AGENT,
        defaultEditor: null,
        userId: USER,
      });

      await service.createPlanFromInput(input(), USER);

      expect(isEnabled).toHaveBeenCalledWith(USER, 'claude');
      expect(isModelEnabled).toHaveBeenCalledWith(USER, 'claude', 'opus');
      expectRalph({
        effort: 'high',
        executionBackend: 'claude',
        model: 'opus',
      });
    });

    it('stamps an empty effort when the preference has none', async () => {
      getForUser.mockResolvedValue({
        defaultAgent: { ...AGENT, effort: null },
        defaultEditor: null,
        userId: USER,
      });

      await service.createPlanFromInput(input(), USER);

      expectRalph({ effort: '', executionBackend: 'claude', model: 'opus' });
    });

    it('reads the preference of the human behind a service account', async () => {
      resolveEffectiveUserId.mockResolvedValue('user-linked');
      getForUser.mockResolvedValue({
        defaultAgent: AGENT,
        defaultEditor: null,
        userId: 'user-linked',
      });

      await service.createPlanFromInput(input(), 'sa-1');

      expect(getForUser).toHaveBeenCalledWith('user-linked');
      expectRalph({ executionBackend: 'claude', model: 'opus' });
    });

    it('falls back to the system default when the agent is disabled', async () => {
      getForUser.mockResolvedValue({
        defaultAgent: AGENT,
        defaultEditor: null,
        userId: USER,
      });
      isEnabled.mockResolvedValue(false);

      await service.createPlanFromInput(input(), USER);

      expectRalph(systemAgent);
    });

    it('falls back to the system default when the model is disabled', async () => {
      getForUser.mockResolvedValue({
        defaultAgent: AGENT,
        defaultEditor: null,
        userId: USER,
      });
      isModelEnabled.mockResolvedValue(false);

      await service.createPlanFromInput(input(), USER);

      expectRalph(systemAgent);
    });

    it('falls back to the system default when the backend is no longer a known driver', async () => {
      getForUser.mockResolvedValue({
        defaultAgent: { ...AGENT, backend: 'retired-cli' },
        defaultEditor: null,
        userId: USER,
      });

      await service.createPlanFromInput(input(), USER);

      expectRalph(systemAgent);
    });

    it('never overrides an explicit runConfigJson', async () => {
      getForUser.mockResolvedValue({
        defaultAgent: AGENT,
        defaultEditor: null,
        userId: USER,
      });
      const explicit = getDefaultPlanRunConfigStorage();

      await service.createPlanFromInput(
        input({ runConfigJson: JSON.stringify(explicit) }),
        USER,
      );

      expect(getForUser).not.toHaveBeenCalled();
      expectRalph(systemAgent);
    });

    it('does not look up preferences without an authenticated user', async () => {
      await service.createPlanFromInput(input());

      expect(getForUser).not.toHaveBeenCalled();
      expectRalph(systemAgent);
    });

    it('still creates the plan with the system default when the lookup throws', async () => {
      getForUser.mockRejectedValue(new Error('boom'));

      const plan = await service.createPlanFromInput(input(), USER);

      expect(plan).toBeDefined();
      expectRalph(systemAgent);
    });
  });
});
