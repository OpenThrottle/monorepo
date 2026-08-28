import { BadRequestException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { createMock } from '@golevelup/ts-vitest';
import { LoggerService } from '@openthrottle/nestjs-modules';
import {
  getDefaultPlanRunConfigStorage,
  PlanEmbeddingsService,
  PlansService,
} from '@openthrottle/nestjs-repositories';
import type {
  PlanData,
  PlanRunConfigStorage,
} from '@openthrottle/nestjs-repositories';
import { embedQuery } from '@openthrottle/node-client';
import type { CreatePlanInput } from '../../graphql/plans/plan.input';
import { CheckoutPathResolutionService } from '../checkout-path-resolution/checkout-path-resolution.service';
import { PlanCreationService } from './plan-creation.service';

vi.mock('@openthrottle/node-client', async (importOriginal) => {
  const mod =
    await importOriginal<typeof import('@openthrottle/node-client')>();
  return {
    ...mod,
    embedQuery: vi.fn(),
  };
});

describe('PlanCreationService', () => {
  let service: PlanCreationService;
  const resolveCheckoutForPath = vi.fn();
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
  const embedRepo = {
    create: vi.fn(),
    save: vi.fn(),
  };

  beforeEach(async () => {
    vi.clearAllMocks();
    vi.mocked(embedQuery).mockResolvedValue(undefined);
    resolveCheckoutForPath.mockResolvedValue(null);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PlanCreationService,
        {
          provide: CheckoutPathResolutionService,
          useValue: { resolveCheckoutForPath },
        },
        {
          provide: LoggerService,
          useValue: createMock<LoggerService>(),
        },
        {
          provide: PlansService,
          useValue: {
            getRepository: () => planRepo,
          },
        },
        {
          provide: PlanEmbeddingsService,
          useValue: {
            getRepository: () => embedRepo,
          },
        },
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

  it('uses GITHUB_USER when author omitted', async () => {
    const prev = process.env.GITHUB_USER;
    process.env.GITHUB_USER = 'fromenv';

    const saved: PlanData = {
      assignee: null,
      author: 'fromenv',
      category: 'feature',
      completedAt: null,
      createdAt: new Date(),
      description: null,
      id: 'p1',
      project: null,
      projectId: null,
      status: 'PENDING',
      summary: null,
      title: 'My plan',
      updatedAt: new Date(),
    };

    planRepo.create.mockReturnValue(saved);
    planRepo.save.mockResolvedValue(saved);

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
      expect(planRepo.create).toHaveBeenCalledWith(
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
      createdAt: new Date(),
      description: null,
      id: 'p-run-config',
      project: null,
      projectId: null,
      status: 'PENDING',
      summary: null,
      title: 'Plan',
      updatedAt: new Date(),
    };

    planRepo.create.mockReturnValue(saved);
    planRepo.save.mockResolvedValue(saved);

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

    expect(planRepo.create).toHaveBeenCalledWith(
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
      createdAt: new Date(),
      description: null,
      id: 'p2',
      project: null,
      projectId: null,
      status: 'PENDING',
      summary: null,
      title: 'Plan',
      updatedAt: new Date(),
    };

    planRepo.create.mockReturnValue(saved);
    planRepo.save.mockResolvedValue(saved);

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

    expect(planRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({ assignee: null }),
    );
  });

  describe('createPlansFromInput', () => {
    const validInput = (title: string): CreatePlanInput => ({
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
    });

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
    ): CreatePlanInput => ({
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
    });

    /** Asserts the `workspace` block the service actually handed to the repository. */
    const expectWorkspace = (
      nth: number,
      expected: Partial<PlanRunConfigStorage['workspace']>,
    ): void => {
      expect(planRepo.create).toHaveBeenNthCalledWith(
        nth,
        expect.objectContaining({
          runConfig: expect.objectContaining({
            workspace: expect.objectContaining(expected),
          }),
        }),
      );
    };

    beforeEach(() => {
      planRepo.create.mockImplementation((fields: unknown) => fields);
      planRepo.save.mockImplementation((entity: unknown) =>
        Promise.resolve(entity),
      );
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

      expectWorkspace(1, RESOLVED);
      expectWorkspace(2, RESOLVED);
    });
  });

  it('persists embedding when embedQuery returns a vector', async () => {
    vi.mocked(embedQuery).mockResolvedValue([0.1, 0.2]);

    const saved: PlanData = {
      assignee: null,
      author: 'visormatt',
      category: 'feature',
      completedAt: null,
      createdAt: new Date(),
      description: 'd',
      id: 'p3',
      project: null,
      projectId: null,
      status: 'PENDING',
      summary: null,
      title: 'Plan',
      updatedAt: new Date(),
    };

    const embeddingRow = { content: 'x', id: 'e1' };
    planRepo.create.mockReturnValue(saved);
    planRepo.save.mockResolvedValue(saved);
    embedRepo.create.mockReturnValue(embeddingRow);
    embedRepo.save.mockResolvedValue(embeddingRow);

    const input: CreatePlanInput = {
      assignee: null,
      author: 'visormatt',
      category: 'feature',
      description: 'd',
      project: null,
      projectId: null,
      status: null,
      summary: null,
      title: 'Plan',
    };

    await service.createPlanFromInput(input);

    expect(embedQuery).toHaveBeenCalled();
    expect(embedRepo.save).toHaveBeenCalledWith(embeddingRow);
  });
});
