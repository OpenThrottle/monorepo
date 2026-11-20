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
    plansRepository.findOne.mockResolvedValue(null);
    plansRepository.update.mockImplementation(async (id, data) => {
      return plansFactory.build({ ...data, id });
    });
    plansRepository.listInProject.mockResolvedValue([]);
    plansRepository.renumberProjectPlans.mockResolvedValue([]);
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
      expect(plansRepository.maxProjectSortOrders).not.toHaveBeenCalled();
    });

    it('takes the first slot (1000) in an empty project', async () => {
      expect(await service.appendSortOrder(PROJECT_A)).toBe(1000);
    });

    it('goes one gap after the highest live position', async () => {
      plansRepository.maxProjectSortOrders.mockResolvedValue(
        new Map([[PROJECT_A, 3000]]),
      );

      expect(await service.appendSortOrder(PROJECT_A)).toBe(4000);
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
      plansRepository.maxProjectSortOrders.mockResolvedValue(
        new Map([[PROJECT_B, 5000]]),
      );

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
      plansRepository.maxProjectSortOrders.mockResolvedValue(
        new Map([[PROJECT_A, 2000]]),
      );

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

  describe('reorderPlans', () => {
    const inProject = plansFactory.buildList(3, { projectId: PROJECT_A });
    const [first, second, third] = inProject.map((plan) => plan.id);

    beforeEach(() => {
      plansRepository.listInProject.mockResolvedValue(inProject);
    });

    it('renumbers in the given order', async () => {
      await service.reorderPlans(PROJECT_A, [third!, first!, second!]);

      expect(plansRepository.renumberProjectPlans).toHaveBeenCalledWith(
        PROJECT_A,
        [third, first, second],
      );
    });

    it('keeps plans that are not listed after the listed ones, in their existing order', async () => {
      await service.reorderPlans(PROJECT_A, [third!]);

      expect(plansRepository.renumberProjectPlans).toHaveBeenCalledWith(
        PROJECT_A,
        [third, first, second],
      );
    });

    it('rejects duplicate ids', async () => {
      await expect(
        service.reorderPlans(PROJECT_A, [first!, first!]),
      ).rejects.toThrow(BadRequestException);
      expect(plansRepository.renumberProjectPlans).not.toHaveBeenCalled();
    });

    it('rejects an id that does not belong to the project', async () => {
      await expect(
        service.reorderPlans(PROJECT_A, [first!, 'someone-elses']),
      ).rejects.toThrow('do not belong to the project');
      expect(plansRepository.renumberProjectPlans).not.toHaveBeenCalled();
    });

    it('rejects an unknown project', async () => {
      findProject.mockResolvedValue(null);

      await expect(service.reorderPlans(PROJECT_A, [])).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
