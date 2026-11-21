import { createMock } from '@golevelup/ts-vitest';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { LoggerService } from '@openthrottle/nestjs-modules';
import {
  PlansRepository,
  ProjectRepositoriesRepository,
  ProjectsRepository,
} from '@openthrottle/nestjs-repositories-server';
import {
  createPlansRepositoryMock,
  plansFactory,
  projectsFactory,
} from '@openthrottle/nestjs-repositories-server/testing';
import type { PlanRunConfigStorage } from '@openthrottle/openthrottle-plan-config';
import { getDefaultPlanRunConfigStorage } from '@openthrottle/openthrottle-plan-config';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { PlanProjectMembershipService } from './plan-project-membership.service.ts';

const PROJECT_A = 'project-a';
const PROJECT_B = 'project-b';
const REPOSITORY_ID = '0f6b5f0e-7d3f-4f43-9c0e-0d3f1f3b6a11';

function runConfigWithRepository(repositoryId: string): PlanRunConfigStorage {
  const defaults = getDefaultPlanRunConfigStorage();

  return { ...defaults, workspace: { ...defaults.workspace, repositoryId } };
}

describe('PlanProjectMembershipService', () => {
  const plansRepository = createPlansRepositoryMock();
  const link = vi.fn();
  const findProject = vi.fn();
  const warn = vi.fn();
  let service: PlanProjectMembershipService;

  beforeEach(async () => {
    vi.clearAllMocks();
    plansRepository.maxProjectSortOrders.mockResolvedValue(new Map());
    plansRepository.appendProjectSortOrder.mockResolvedValue(1000);
    plansRepository.findOne.mockResolvedValue(null);
    plansRepository.update.mockImplementation(async (id, data) => {
      return plansFactory.build({ ...data, id });
    });
    plansRepository.listInProject.mockResolvedValue([]);
    findProject.mockResolvedValue(projectsFactory.build({ id: PROJECT_A }));
    link.mockResolvedValue({});

    const app = await Test.createTestingModule({
      providers: [
        PlanProjectMembershipService,
        {
          provide: LoggerService,
          useValue: createMock<LoggerService>({ warn }),
        },
        { provide: PlansRepository, useValue: plansRepository },
        { provide: ProjectRepositoriesRepository, useValue: { link } },
        { provide: ProjectsRepository, useValue: { findOne: findProject } },
      ],
    }).compile();

    service = app.get(PlanProjectMembershipService);
  });

  describe('appendSortOrder', () => {
    it('is null for a plan with no project and reads nothing', async () => {
      expect(await service.appendSortOrder(null)).toBeNull();
      expect(plansRepository.appendProjectSortOrder).not.toHaveBeenCalled();
    });

    it('takes the first slot (1000) in an empty project', async () => {
      expect(await service.appendSortOrder(PROJECT_A)).toBe(1000);
    });

    it('goes one gap after the highest live position', async () => {
      plansRepository.appendProjectSortOrder.mockResolvedValue(4000);

      expect(await service.appendSortOrder(PROJECT_A)).toBe(4000);
      expect(plansRepository.appendProjectSortOrder).toHaveBeenCalledWith(
        PROJECT_A,
        undefined,
      );
    });
  });

  describe('appendSortOrders', () => {
    it('hands out consecutive gaps per project across the batch, keeping nulls null', async () => {
      plansRepository.maxProjectSortOrders.mockResolvedValue(
        new Map([[PROJECT_A, 2000]]),
      );

      const result = await service.appendSortOrders([
        PROJECT_A,
        null,
        PROJECT_B,
        PROJECT_A,
        PROJECT_B,
      ]);

      expect(result).toEqual([3000, null, 1000, 4000, 2000]);
      expect(plansRepository.maxProjectSortOrders).toHaveBeenCalledWith(
        [PROJECT_A, PROJECT_B],
        undefined,
      );
    });
  });

  describe('applyProjectChange', () => {
    it('appends a plan moving from one project to another at the end of the new one', async () => {
      const plan = plansFactory.build({
        projectId: PROJECT_A,
        projectSortOrder: 1000,
      });
      plansRepository.appendProjectSortOrder.mockResolvedValue(6000);

      await service.applyProjectChange(plan, PROJECT_B);

      expect(plan.projectId).toBe(PROJECT_B);
      expect(plan.projectSortOrder).toBe(6000);
    });

    it('clears both columns when the project is unset', async () => {
      const plan = plansFactory.build({
        projectId: PROJECT_A,
        projectSortOrder: 2000,
      });

      await service.applyProjectChange(plan, null);

      expect(plan.projectId).toBeNull();
      expect(plan.projectSortOrder).toBeNull();
    });

    it('keeps the position of a plan already in the project', async () => {
      const plan = plansFactory.build({
        projectId: PROJECT_A,
        projectSortOrder: 2000,
      });

      await service.applyProjectChange(plan, PROJECT_A);

      expect(plan.projectSortOrder).toBe(2000);
      expect(plansRepository.maxProjectSortOrders).not.toHaveBeenCalled();
    });
  });

  describe('linkPlanRepository', () => {
    it('links the plan repository to the plan project', async () => {
      await service.linkPlanRepository(
        plansFactory.build({
          projectId: PROJECT_A,
          runConfig: runConfigWithRepository(REPOSITORY_ID),
        }),
      );

      expect(link).toHaveBeenCalledWith(PROJECT_A, REPOSITORY_ID);
    });

    it('does nothing for a plan without a project', async () => {
      await service.linkPlanRepository(
        plansFactory.build({
          projectId: null,
          runConfig: runConfigWithRepository(REPOSITORY_ID),
        }),
      );

      expect(link).not.toHaveBeenCalled();
    });

    it('does nothing when the plan names no repository', async () => {
      await service.linkPlanRepository(
        plansFactory.build({
          projectId: PROJECT_A,
          runConfig: getDefaultPlanRunConfigStorage(),
        }),
      );

      expect(link).not.toHaveBeenCalled();
    });

    it('never blocks: a failed link is logged and swallowed', async () => {
      link.mockRejectedValue(new Error('foreign key violation'));

      await expect(
        service.linkPlanRepository(
          plansFactory.build({
            projectId: PROJECT_A,
            runConfig: runConfigWithRepository(REPOSITORY_ID),
          }),
        ),
      ).resolves.toBeUndefined();
      expect(warn).toHaveBeenCalledWith(
        expect.stringContaining('foreign key violation'),
      );
    });
  });

  describe('addPlan', () => {
    it('appends the plan to the project, persists both columns and auto-links its repository', async () => {
      const plan = plansFactory.build({
        projectId: null,
        projectSortOrder: null,
        runConfig: runConfigWithRepository(REPOSITORY_ID),
      });
      plansRepository.findOne.mockResolvedValue(plan);
      plansRepository.appendProjectSortOrder.mockResolvedValue(3000);

      const result = await service.addPlan(plan.id, PROJECT_A);

      expect(result.projectSortOrder).toBe(3000);
      expect(plansRepository.update).toHaveBeenCalledWith(plan.id, {
        projectId: PROJECT_A,
        projectSortOrder: 3000,
      });
      expect(link).toHaveBeenCalledWith(PROJECT_A, REPOSITORY_ID);
    });

    it('moves a plan from another project to the end of the new one', async () => {
      const plan = plansFactory.build({
        projectId: PROJECT_B,
        projectSortOrder: 1000,
      });
      plansRepository.findOne.mockResolvedValue(plan);

      const result = await service.addPlan(plan.id, PROJECT_A);

      expect(result.projectId).toBe(PROJECT_A);
      expect(result.projectSortOrder).toBe(1000);
      expect(plansRepository.update).toHaveBeenCalledTimes(1);
    });

    it('leaves a plan already in the project where it is', async () => {
      const plan = plansFactory.build({
        projectId: PROJECT_A,
        projectSortOrder: 2000,
      });
      plansRepository.findOne.mockResolvedValue(plan);

      const result = await service.addPlan(plan.id, PROJECT_A);

      expect(result.projectSortOrder).toBe(2000);
      expect(plansRepository.update).not.toHaveBeenCalled();
    });

    it('still succeeds when the auto-link fails', async () => {
      const plan = plansFactory.build({
        projectId: null,
        projectSortOrder: null,
        runConfig: runConfigWithRepository(REPOSITORY_ID),
      });
      plansRepository.findOne.mockResolvedValue(plan);
      link.mockRejectedValue(new Error('boom'));

      await expect(service.addPlan(plan.id, PROJECT_A)).resolves.toBe(plan);
    });

    it('rejects an unknown plan', async () => {
      await expect(service.addPlan('missing', PROJECT_A)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('rejects an unknown project', async () => {
      plansRepository.findOne.mockResolvedValue(plansFactory.build());
      findProject.mockResolvedValue(null);

      await expect(service.addPlan('p', PROJECT_A)).rejects.toThrow(
        NotFoundException,
      );
      expect(plansRepository.update).not.toHaveBeenCalled();
    });
  });

  describe('removePlan', () => {
    it('clears project_id and project_sort_order', async () => {
      const plan = plansFactory.build({
        projectId: PROJECT_A,
        projectSortOrder: 2000,
      });
      plansRepository.findOne.mockResolvedValue(plan);

      const result = await service.removePlan(plan.id);

      expect(result.projectId).toBeNull();
      expect(result.projectSortOrder).toBeNull();
      expect(plansRepository.update).toHaveBeenCalledWith(plan.id, {
        projectId: null,
        projectSortOrder: null,
      });
    });

    it('returns a plan with no project unchanged', async () => {
      const plan = plansFactory.build({
        projectId: null,
        projectSortOrder: null,
      });
      plansRepository.findOne.mockResolvedValue(plan);

      await service.removePlan(plan.id);

      expect(plansRepository.update).not.toHaveBeenCalled();
    });

    it('rejects an unknown plan', async () => {
      await expect(service.removePlan('missing')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('pagePlans', () => {
    it('reads the page from the repository', async () => {
      const plans = plansFactory.buildList(2, { projectId: PROJECT_A });
      plansRepository.pageInProject.mockResolvedValue({
        items: plans,
        totalCount: 94,
      });

      await expect(
        service.pagePlans(PROJECT_A, { limit: 50, offset: 50 }),
      ).resolves.toEqual({ items: plans, totalCount: 94 });
      expect(plansRepository.pageInProject).toHaveBeenCalledWith(PROJECT_A, {
        limit: 50,
        offset: 50,
      });
    });
  });

  describe('movePlan', () => {
    const inProject = plansFactory.buildList(3, { projectId: PROJECT_A });
    const [, second] = inProject.map((plan) => plan.id);

    beforeEach(() => {
      plansRepository.listInProject.mockResolvedValue(inProject);
    });

    it('swaps through the repository and returns the project in its new order', async () => {
      plansRepository.moveInProject.mockResolvedValue({
        kind: 'moved',
        neighbourId: 'neighbour',
        scopeId: PROJECT_A,
      });

      await expect(service.movePlan(second!, 'UP')).resolves.toBe(inProject);
      expect(plansRepository.moveInProject).toHaveBeenCalledWith(second, 'UP');
      expect(plansRepository.listInProject).toHaveBeenCalledWith(PROJECT_A);
    });

    it('returns the project unchanged when the plan is already at that end', async () => {
      plansRepository.moveInProject.mockResolvedValue({
        kind: 'at-edge',
        scopeId: PROJECT_A,
      });

      await expect(service.movePlan(second!, 'DOWN')).resolves.toBe(inProject);
    });

    it('rejects a plan that does not exist', async () => {
      plansRepository.moveInProject.mockResolvedValue({ kind: 'not-found' });

      await expect(service.movePlan('missing', 'UP')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('rejects a plan in no project', async () => {
      plansRepository.moveInProject.mockResolvedValue({ kind: 'not-in-scope' });

      await expect(service.movePlan('loose', 'UP')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('reorderPlans', () => {
    const inProject = plansFactory.buildList(3, { projectId: PROJECT_A });
    const [first, second, third] = inProject.map((plan) => plan.id);

    beforeEach(() => {
      plansRepository.listInProject.mockResolvedValue(inProject);
    });

    it('reorders the listed plans in place and returns the project in its new order', async () => {
      plansRepository.reorderInProject.mockResolvedValue({
        assignments: [],
        kind: 'reordered',
      });

      await expect(
        service.reorderPlans(PROJECT_A, [third!, first!, second!]),
      ).resolves.toBe(inProject);
      expect(plansRepository.reorderInProject).toHaveBeenCalledWith(PROJECT_A, [
        third,
        first,
        second,
      ]);
    });

    it('rejects duplicate ids', async () => {
      plansRepository.reorderInProject.mockResolvedValue({
        duplicateIds: [first!],
        kind: 'duplicate-ids',
      });

      await expect(
        service.reorderPlans(PROJECT_A, [first!, first!]),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects an id that does not belong to the project', async () => {
      plansRepository.reorderInProject.mockResolvedValue({
        kind: 'ids-not-in-scope',
        missingIds: ['someone-elses'],
      });

      await expect(
        service.reorderPlans(PROJECT_A, [first!, 'someone-elses']),
      ).rejects.toThrow('do not belong to the project');
    });

    it('rejects an unknown project', async () => {
      findProject.mockResolvedValue(null);

      await expect(service.reorderPlans(PROJECT_A, [])).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
