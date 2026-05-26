import { BadRequestException, Injectable } from '@nestjs/common';
import { LoggerService } from '@openthrottle/nestjs-modules';
import type { Plan } from '@openthrottle/nestjs-repositories';
import {
  getDefaultPlanRunConfigStorage,
  parsePlanRunConfigJson,
  PlanEmbeddingsService,
  PlansService,
} from '@openthrottle/nestjs-repositories';
import { embedQuery } from '@openthrottle/ai-mcp/src/cortex-server';
import type { CreatePlanInput } from '../../graphql/plans/plan.input';

/** @description Same GitHub-login rule as assignee normalization in @openthrottle/ai-mcp cortex-client. */
const GITHUB_USERNAME_REGEX =
  /^[a-zA-Z0-9](?:[a-zA-Z0-9]|-(?=[a-zA-Z0-9])){0,38}$/;

function normalizeAssignee(value: string | null | undefined): string | null {
  if (value === null || value === undefined) return null;
  const trimmed = String(value).trim();
  if (trimmed === '') return null;
  return GITHUB_USERNAME_REGEX.test(trimmed) ? trimmed : null;
}

/**
 * @description Builds searchable text for a plan row (aligned with {@link buildPlanContentForEmbedding} in @openthrottle/ai-mcp).
 */
function buildPlanEmbeddingContent(
  plan: Pick<Plan, 'author' | 'category' | 'description' | 'summary' | 'title'>,
): string {
  const parts = [
    plan.title,
    plan.description ?? '',
    plan.summary ?? '',
    plan.author,
    plan.category,
  ];
  return parts.filter(Boolean).join('\n');
}

/**
 * @description Canonical server-side plan creation so GraphQL and MCP callers share one code path (see Cortex plan align UI vs MCP).
 */
@Injectable()
export class PlanCreationService {
  private readonly name = 'plan-creation';

  constructor(
    private readonly logger: LoggerService,
    private readonly planEmbeddingsService: PlanEmbeddingsService,
    private readonly plansService: PlansService,
  ) {
    this.logger.debug(`🧩 ${this.name} 🧩`);
  }

  /**
   * @description Persists a plan using the same input contract as GraphQL `createPlan` / MCP `create_plan`, with Cortex-style assignee normalization, optional `GITHUB_USER` author default, and best-effort plan embedding for semantic search.
   */
  async createPlanFromInput(input: CreatePlanInput): Promise<Plan> {
    const defaultGh = process.env.GITHUB_USER?.trim();
    const title = input.title?.trim() ?? '';
    const category = input.category?.trim() ?? '';

    if (title === '') {
      throw new BadRequestException('title is required.');
    }
    if (category === '') {
      throw new BadRequestException('category is required.');
    }

    const trimmedAuthor = (input.author ?? '').trim();
    const author =
      trimmedAuthor !== '' ? trimmedAuthor : (defaultGh ?? '').trim();

    if (author === '') {
      throw new BadRequestException(
        'author is required when GITHUB_USER is not set.',
      );
    }

    const assignee = normalizeAssignee(input.assignee ?? null);

    const parsedRunConfig = parsePlanRunConfigJson(input.runConfigJson);
    const runConfig =
      parsedRunConfig ?? getDefaultPlanRunConfigStorage();

    const repo = this.plansService.getRepository();
    const entity = repo.create({
      assignee,
      author,
      category,
      description: input.description ?? null,
      project: input.project ?? null,
      projectId: input.projectId ?? null,
      runConfig,
      status: (input.status ?? 'PENDING').toUpperCase(),
      summary: input.summary ?? null,
      title,
    });

    const saved = await repo.save(entity);

    await this.maybeInsertPlanEmbedding(saved);

    return saved;
  }

  /**
   * @description Inserts a plan_embeddings row when an embedder is configured; failures do not roll back the plan.
   */
  private async maybeInsertPlanEmbedding(plan: Plan): Promise<void> {
    const content = buildPlanEmbeddingContent(plan);
    if (content.trim() === '') {
      return;
    }

    try {
      const embedding = await embedQuery(content);
      if (embedding == null || embedding.length === 0) {
        return;
      }

      const embedRepo = this.planEmbeddingsService.getRepository();
      await embedRepo.save(
        embedRepo.create({
          content,
          embedding,
          metadata: {},
          planId: plan.id,
        }),
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.warn(`${this.name}: plan embedding skipped: ${message}`);
    }
  }
}
