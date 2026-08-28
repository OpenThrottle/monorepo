import { BadRequestException, Injectable } from '@nestjs/common';
import { LoggerService } from '@openthrottle/nestjs-modules';
import type { PlanRunConfigStorage } from '@openthrottle/nestjs-repositories';
import {
  getDefaultPlanRunConfigStorage,
  parsePlanRunConfigJson,
  Plan,
  PlanEmbeddingsService,
  PlansService,
} from '@openthrottle/nestjs-repositories';
import { embedQuery } from '@openthrottle/node-client';
import type { CreatePlanInput } from '../../graphql/plans/plan.input';
import { CheckoutPathResolutionService } from '../checkout-path-resolution/checkout-path-resolution.service';
import { EffectiveUserResolutionService } from '../effective-user-resolution/effective-user-resolution.service';

/** @description Same GitHub-login rule as assignee normalization in @openthrottle/node-client openthrottle-client. */
const GITHUB_USERNAME_REGEX =
  /^[a-zA-Z0-9](?:[a-zA-Z0-9]|-(?=[a-zA-Z0-9])){0,38}$/;

function normalizeAssignee(value: string | null | undefined): string | null {
  if (value === null || value === undefined) return null;

  const trimmed = String(value).trim();
  if (trimmed === '') return null;

  return GITHUB_USERNAME_REGEX.test(trimmed) ? trimmed : null;
}

/**
 * @description Builds searchable text for a plan row (aligned with {@link buildPlanContentForEmbedding} in @openthrottle/node-client).
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
 * @description Canonical server-side plan creation so GraphQL and MCP callers share one code path (see OpenThrottle plan align UI vs MCP).
 */
@Injectable()
export class PlanCreationService {
  private readonly name = 'plan-creation';

  constructor(
    private readonly logger: LoggerService,
    private readonly checkoutPathResolutionService: CheckoutPathResolutionService,
    private readonly effectiveUserResolutionService: EffectiveUserResolutionService,
    private readonly planEmbeddingsService: PlanEmbeddingsService,
    private readonly plansService: PlansService,
  ) {
    this.logger.debug(`🧩 ${this.name} 🧩`);
  }

  /**
   * @description Validates and normalizes a single create input into the persisted plan column set
   * (OpenThrottle-style assignee normalization, optional `GITHUB_USER` author default, run-config defaulting).
   * Throws {@link BadRequestException} on missing title/category/author. Shared by single and batch create.
   */
  private async resolvePlanCreateFields(
    input: CreatePlanInput,
    userId?: string,
  ): Promise<{
    assignee: string | null;
    author: string;
    category: string;
    completedAt: Date | null;
    description: string | null;
    project: string | null;
    projectId: string | null;
    runConfig: PlanRunConfigStorage;
    status: string;
    summary: string | null;
    title: string;
  }> {
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

    const parsedRunConfig = parsePlanRunConfigJson(input.runConfigJson);
    const status = (input.status ?? 'PENDING').toUpperCase();

    return {
      assignee: normalizeAssignee(input.assignee ?? null),
      author,
      category,
      completedAt: status === 'COMPLETED' ? new Date() : null,
      description: input.description ?? null,
      project: input.project ?? null,
      projectId: input.projectId ?? null,
      runConfig: await this.seedWorkspaceFromPath(
        parsedRunConfig ?? getDefaultPlanRunConfigStorage(),
        input.workspacePath,
        userId,
      ),
      status,
      summary: input.summary ?? null,
      title,
    };
  }

  /**
   * @description Records the workspace the plan was CREATED in, so the Configuration tab's
   * `02. Workspace` opens pre-selected instead of asking for a fact the caller already knew.
   *
   * `workspacePath` is a hint from the client, never a filesystem path we act on: it is resolved
   * server-side against the caller's own registered checkouts (see
   * {@link CheckoutPathResolutionService}), so a path the caller does not own seeds nothing.
   *
   * Precedence, highest first: an explicit `runConfigJson` workspace, then the resolved path, then
   * nothing (today's root default plus the UI's `projectId` prefill).
   *
   * This is a convenience, never a gate — an unresolvable path, a missing user or an error inside
   * resolution all return the run config unchanged rather than failing plan creation.
   */
  private async seedWorkspaceFromPath(
    runConfig: PlanRunConfigStorage,
    workspacePath: string | null | undefined,
    userId: string | undefined,
  ): Promise<PlanRunConfigStorage> {
    const path = workspacePath?.trim() ?? '';
    if (path === '' || userId === undefined || userId.trim() === '') {
      return runConfig;
    }

    const { checkoutId, repositoryId, workingDirectory } = runConfig.workspace;
    if (checkoutId !== '' || repositoryId !== '' || workingDirectory !== '') {
      this.logger.debug(
        `${this.name}: workspacePath ignored; runConfigJson already names a workspace`,
      );
      return runConfig;
    }

    try {
      // The sub may be a service account (the MCP's usual caller), which owns
      // no checkouts itself — resolve the human user it acts as first.
      const effectiveUserId =
        await this.effectiveUserResolutionService.resolveEffectiveUserId(
          userId,
        );

      if (effectiveUserId === null) {
        this.logger.debug(
          `${this.name}: workspacePath ignored; caller resolves to no user (unlinked service account?)`,
        );
        return runConfig;
      }

      const resolved =
        await this.checkoutPathResolutionService.resolveCheckoutForPath({
          path,
          userId: effectiveUserId,
        });

      if (resolved === null) {
        this.logger.debug(
          `${this.name}: workspacePath ${path} is not a registered checkout for this user`,
        );
        return runConfig;
      }

      return {
        ...runConfig,
        workspace: {
          ...runConfig.workspace,
          checkoutId: resolved.checkoutId,
          repositoryId: resolved.repositoryId,
        },
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.warn(
        `${this.name}: workspacePath resolution failed, falling back to defaults: ${message}`,
      );
      return runConfig;
    }
  }

  /**
   * @description Persists a plan using the same input contract as GraphQL `createPlan` / MCP `create_plan`, with OpenThrottle-style assignee normalization, optional `GITHUB_USER` author default, and best-effort plan embedding for semantic search.
   */
  async createPlanFromInput(
    input: CreatePlanInput,
    userId?: string,
  ): Promise<Plan> {
    const repo = this.plansService.getRepository();
    const entity = repo.create(
      await this.resolvePlanCreateFields(input, userId),
    );

    const saved = await repo.save(entity);

    await this.maybeInsertPlanEmbedding(saved);

    return saved;
  }

  /**
   * @description Atomically create many plans in one transaction. Every input is validated/normalized
   * up front (same rules as {@link createPlanFromInput}); a single bad input throws before anything is
   * persisted, and any DB failure rolls back the whole batch. Embeddings are inserted best-effort after
   * commit (failures never roll back the plans), matching the single-create path. Returns saved plans in
   * input order.
   */
  async createPlansFromInput(
    inputs: readonly CreatePlanInput[],
    userId?: string,
  ): Promise<Plan[]> {
    if (inputs.length === 0) return [];

    const fieldsList = await Promise.all(
      inputs.map((input) => this.resolvePlanCreateFields(input, userId)),
    );

    const repo = this.plansService.getRepository();
    const saved = await repo.manager.transaction(async (manager) => {
      const planRepo = manager.getRepository(Plan);
      const entities = fieldsList.map((fields) => planRepo.create(fields));

      return planRepo.save(entities);
    });

    await Promise.all(saved.map((plan) => this.maybeInsertPlanEmbedding(plan)));

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
