/**
 * @description The one place a plan joins, leaves or is reordered within a project. A plan
 * belongs to at most one project and carries a gap-based `project_sort_order` (1000, 2000, …,
 * unique per project among live plans, null exactly when there is no project). Every writer of
 * `plans.project_id` (createPlan, createPlans, updatePlan, task promotion, the
 * add/remove/reorder mutations) goes through here so the position is assigned or cleared the
 * same way, and so the plan's repository is auto-linked to the project.
 *
 * The repository link is a soft constraint: a plan whose `runConfigJson.workspace.repositoryId`
 * is set links that repository to the project in `project_repositories` when it is not already
 * linked. It never blocks; a failed link is logged and the membership change still lands.
 */
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { LoggerService } from '@openthrottle/nestjs-modules';
import type {
  Plan,
  ProjectPlansPage,
  ProjectPlansPageResult,
} from '@openthrottle/nestjs-repositories-server';
import {
  PlansRepository,
  PROJECT_PLAN_SORT_ORDER_GAP,
  ProjectRepositoriesRepository,
  ProjectsRepository,
} from '@openthrottle/nestjs-repositories-server';
import { planRunConfigFromPlanStorage } from '@openthrottle/openthrottle-plan-config';
import type { EntityManager } from 'typeorm';

import { PROJECT_PLAN_MOVE_DIRECTION } from './plan-project-membership.constants.ts';
import type { ProjectPlanMoveDirection } from './plan-project-membership.types.ts';

@Injectable()
export class PlanProjectMembershipService {
  private readonly name = 'plan-project-membership';

  constructor(
    private readonly logger: LoggerService,
    private readonly plansRepository: PlansRepository,
    private readonly projectRepositoriesRepository: ProjectRepositoriesRepository,
    private readonly projectsRepository: ProjectsRepository,
  ) {}

  /**
   * @description The position that appends a plan to the end of `projectId`: the highest live
   * position plus the gap, or the first slot for an empty project. Null for a plan with no
   * project. Pass `manager` to read inside the caller's transaction.
   */
  async appendSortOrder(
    projectId: string | null,
    manager?: EntityManager,
  ): Promise<number | null> {
    if (projectId === null) {
      return null;
    }

    const maxByProject = await this.plansRepository.maxProjectSortOrders(
      [projectId],
      manager,
    );

    return (maxByProject.get(projectId) ?? 0) + PROJECT_PLAN_SORT_ORDER_GAP;
  }

  /**
   * @description Positions for a batch of new plans, one per entry of `projectIds` and in the
   * same order: each plan is appended after the project's current maximum and after the
   * earlier plans of the same batch. Null entries (no project) stay null.
   */
  async appendSortOrders(
    projectIds: readonly (string | null)[],
    manager?: EntityManager,
  ): Promise<(number | null)[]> {
    const distinct = [
      ...new Set(
        projectIds.filter((projectId): projectId is string => {
          return projectId !== null;
        }),
      ),
    ];
    const maxByProject = await this.plansRepository.maxProjectSortOrders(
      distinct,
      manager,
    );
    const lastByProject = new Map(maxByProject);

    return projectIds.map((projectId) => {
      if (projectId === null) {
        return null;
      }
      const next =
        (lastByProject.get(projectId) ?? 0) + PROJECT_PLAN_SORT_ORDER_GAP;
      lastByProject.set(projectId, next);

      return next;
    });
  }

  /**
   * @description Points an already-loaded plan at `nextProjectId` (or at none) and sets its
   * position to match: appended at the end of the new project, or cleared. The caller saves
   * the entity. A plan already in that project keeps its position.
   */
  async applyProjectChange(
    plan: Plan,
    nextProjectId: string | null,
  ): Promise<void> {
    if (plan.projectId === nextProjectId && nextProjectId !== null) {
      return;
    }

    plan.projectId = nextProjectId;
    plan.projectSortOrder = await this.appendSortOrder(nextProjectId);
  }

  /**
   * @description Soft repository constraint: links the plan's workspace repository
   * (`runConfig.workspace.repositoryId`) to its project when the plan has both and the pair is
   * not already linked. Never throws; a failure is logged.
   */
  async linkPlanRepository(
    plan: Pick<Plan, 'id' | 'projectId' | 'runConfig'>,
  ): Promise<void> {
    if (plan.projectId === null) {
      return;
    }

    const repositoryId = planRunConfigFromPlanStorage(plan.runConfig, {
      planId: plan.id,
    }).workspace.repositoryId.trim();

    if (repositoryId === '') {
      return;
    }

    try {
      await this.projectRepositoriesRepository.link(
        plan.projectId,
        repositoryId,
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.warn(
        `${this.name}: could not link repository ${repositoryId} to project ${plan.projectId} for plan ${plan.id}: ${message}`,
      );
    }
  }

  /**
   * @description Links the repositories of several plans to their projects, one link per
   * distinct (project, repository) pair.
   */
  async linkPlanRepositories(
    plans: readonly Pick<Plan, 'id' | 'projectId' | 'runConfig'>[],
  ): Promise<void> {
    await Promise.all(
      plans.map((plan) => {
        return this.linkPlanRepository(plan);
      }),
    );
  }

  /**
   * @description Live plans of a project in project order.
   */
  async listPlans(projectId: string): Promise<Plan[]> {
    return this.plansRepository.listInProject(projectId);
  }

  /**
   * @description One page of a project's live plans in project order, plus the total count.
   */
  async pagePlans(
    projectId: string,
    page: ProjectPlansPage,
  ): Promise<ProjectPlansPageResult> {
    return this.plansRepository.pageInProject(projectId, page);
  }

  /**
   * @description Swaps a plan with its neighbour in the project's full order (`UP` = earlier),
   * so a move works across any page boundary the caller renders. A plan already at that end is
   * left in place. Returns every live plan of the project in the resulting order.
   * @throws BadRequestException when the plan is in no project.
   * @throws NotFoundException when the plan does not exist.
   */
  async movePlan(
    planId: string,
    direction: ProjectPlanMoveDirection,
  ): Promise<Plan[]> {
    const plan = await this.plansRepository.findOne({ where: { id: planId } });

    if (!plan) {
      throw new NotFoundException(`Plan not found: ${planId}`);
    }
    if (plan.projectId === null) {
      throw new BadRequestException(`Plan is not in a project: ${planId}`);
    }

    const current = await this.plansRepository.listInProject(plan.projectId);
    const ids = current.map((row) => {
      return row.id;
    });
    const index = ids.indexOf(planId);
    const target =
      direction === PROJECT_PLAN_MOVE_DIRECTION.UP ? index - 1 : index + 1;
    const neighbour = ids[target];

    if (index === -1 || neighbour === undefined) {
      return current;
    }

    ids[target] = planId;
    ids[index] = neighbour;

    return this.plansRepository.renumberProjectPlans(plan.projectId, ids);
  }

  /**
   * @description Adds a plan to a project, appended after the project's last plan, and links
   * the plan's repository to the project. Idempotent for a plan already in that project; a
   * plan in another project moves and lands at the end of the new one.
   * @throws NotFoundException when the plan or the project does not exist.
   */
  async addPlan(planId: string, projectId: string): Promise<Plan> {
    const [plan, project] = await Promise.all([
      this.plansRepository.findOne({ where: { id: planId } }),
      this.projectsRepository.findOne({ where: { id: projectId } }),
    ]);

    if (!plan) {
      throw new NotFoundException(`Plan not found: ${planId}`);
    }
    if (!project) {
      throw new NotFoundException(`Project not found: ${projectId}`);
    }

    if (plan.projectId !== projectId || plan.projectSortOrder === null) {
      plan.projectId = projectId;
      plan.projectSortOrder = await this.appendSortOrder(projectId);
      await this.plansRepository.update(plan.id, {
        projectId: plan.projectId,
        projectSortOrder: plan.projectSortOrder,
      });
    }

    await this.linkPlanRepository(plan);

    return plan;
  }

  /**
   * @description Removes a plan from its project, clearing both `project_id` and
   * `project_sort_order`. The project's repository links stay. A plan with no project is
   * returned unchanged.
   * @throws NotFoundException when the plan does not exist.
   */
  async removePlan(planId: string): Promise<Plan> {
    const plan = await this.plansRepository.findOne({ where: { id: planId } });

    if (!plan) {
      throw new NotFoundException(`Plan not found: ${planId}`);
    }

    if (plan.projectId === null && plan.projectSortOrder === null) {
      return plan;
    }

    plan.projectId = null;
    plan.projectSortOrder = null;
    await this.plansRepository.update(plan.id, {
      projectId: null,
      projectSortOrder: null,
    });

    return plan;
  }

  /**
   * @description Reorders the plans of a project. `planIds` must be unique live plans of the
   * project; they are renumbered 1000, 2000, … in that order, atomically. Plans of the project
   * that are not listed follow them in their existing relative order, so the project is always
   * left fully and uniquely numbered. Returns every live plan of the project in the new order.
   * @throws BadRequestException on a duplicate id or an id that is not a plan of the project.
   * @throws NotFoundException when the project does not exist.
   */
  async reorderPlans(
    projectId: string,
    planIds: readonly string[],
  ): Promise<Plan[]> {
    const project = await this.projectsRepository.findOne({
      where: { id: projectId },
    });

    if (!project) {
      throw new NotFoundException(`Project not found: ${projectId}`);
    }

    if (new Set(planIds).size !== planIds.length) {
      throw new BadRequestException('planIds must not contain duplicates');
    }

    const current = await this.plansRepository.listInProject(projectId);
    const currentIds = new Set(
      current.map((plan) => {
        return plan.id;
      }),
    );

    if (
      !planIds.every((id) => {
        return currentIds.has(id);
      })
    ) {
      throw new BadRequestException(
        'One or more planIds do not belong to the project',
      );
    }

    const listed = new Set(planIds);
    const unlisted = current
      .filter((plan) => {
        return !listed.has(plan.id);
      })
      .map((plan) => {
        return plan.id;
      });

    return this.plansRepository.renumberProjectPlans(projectId, [
      ...planIds,
      ...unlisted,
    ]);
  }
}
