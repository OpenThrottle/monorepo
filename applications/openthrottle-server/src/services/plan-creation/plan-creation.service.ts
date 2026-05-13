import { Injectable } from '@nestjs/common';
import { LoggerService } from '@openthrottle/nestjs-modules';
import type { Plan } from '@openthrottle/nestjs-repositories';
import { PlansService } from '@openthrottle/nestjs-repositories';
import type { CreatePlanInput } from '../../graphql/plans/plan.input';

/**
 * @description Canonical server-side plan creation so GraphQL and MCP callers share one code path (see Cortex plan align UI vs MCP).
 */
@Injectable()
export class PlanCreationService {
  private readonly name = 'plan-creation';

  constructor(
    private readonly logger: LoggerService,
    private readonly plansService: PlansService,
  ) {
    this.logger.debug(`🧩 ${this.name} 🧩`);
  }

  /**
   * @description Persists a plan using the same input contract as GraphQL `createPlan` / MCP `create_plan`.
   * TODO(Plan-Id:2d0865da-9cf6-4f1a-a020-b80dc056d887, Task-Id:51ac27c2-6004-4a9b-9de0-1b6a87720163): Move persistence from {@link PlansResolver.createPlan}; add author/assignee defaults, validation, and post-create hooks (e.g. embeddings) to match mcp-developer behavior.
   */
  async createPlanFromInput(_input: CreatePlanInput): Promise<Plan> {
    void _input;
    void this.plansService;
    this.logger.warn(
      `${this.name}: createPlanFromInput not implemented yet (scaffold for follow-on task)`,
    );
    throw new Error(
      'PlanCreationService.createPlanFromInput is not implemented; complete server parity task first.',
    );
  }
}
