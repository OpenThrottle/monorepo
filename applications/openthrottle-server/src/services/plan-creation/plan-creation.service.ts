import { BadRequestException, Injectable } from '@nestjs/common';
import { LoggerService } from '@openthrottle/nestjs-modules';
import type { PlanRunConfigStorage } from '@openthrottle/nestjs-repositories';
import {
  getDefaultPlanRunConfigStorage,
  parsePlanRunConfigJson,
} from '@openthrottle/nestjs-repositories';
import { UserPreferencesRepository } from '@openthrottle/nestjs-repositories-server';
import {
  Plan,
  PlansRepository,
  UserDisabledAgentClisRepository,
} from '@openthrottle/nestjs-repositories-server';
import { DataSource } from 'typeorm';

import type { CreatePlanInput } from '../../graphql/plans/plan.input.ts';
import { CheckoutPathResolutionService } from '../checkout-path-resolution/checkout-path-resolution.service.ts';
import { EffectiveUserResolutionService } from '../effective-user-resolution/effective-user-resolution.service.ts';
import {
  applyDefaultAgentToRunConfig,
  isUniqueViolation,
  readClientPlanId,
} from './plan-creation.utils.ts';

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
 * @description Canonical server-side plan creation so GraphQL and MCP callers share one code path (see OpenThrottle plan align UI vs MCP).
 */
@Injectable()
export class PlanCreationService {
  private readonly name = 'plan-creation';

  constructor(
    private readonly dataSource: DataSource,
    private readonly logger: LoggerService,
    private readonly disabledAgentClis: UserDisabledAgentClisRepository,
    private readonly checkoutPathResolutionService: CheckoutPathResolutionService,
    private readonly effectiveUserResolutionService: EffectiveUserResolutionService,
    private readonly plansRepository: PlansRepository,
    private readonly userPreferencesRepository: UserPreferencesRepository,
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
        parsedRunConfig ?? (await this.defaultRunConfigForUser(userId)),
        input.workspacePath,
        userId,
      ),
      status,
      summary: input.summary ?? null,
      title,
    };
  }

  /**
   * @description The run config a plan gets when the caller sent none: the system defaults, with
   * the creating user's default agent (backend + model + effort) stamped over the Ralph runner
   * when they have one that is still valid.
   *
   * Only reached when `runConfigJson` is absent — an explicit run config always wins (D3).
   * "Valid" means a known driver whose agent and model the user has not disabled; anything else
   * silently keeps the system default and the preference row is never touched. Like workspace
   * seeding this is a convenience, never a gate: a missing user or a lookup error returns the
   * system defaults rather than failing plan creation.
   */
  private async defaultRunConfigForUser(
    userId: string | undefined,
  ): Promise<PlanRunConfigStorage> {
    const defaults = getDefaultPlanRunConfigStorage();
    if (userId === undefined || userId.trim() === '') {
      return defaults;
    }

    try {
      // MCP `create_plan` usually runs as a service account; its preferences are its human's.
      const effectiveUserId =
        await this.effectiveUserResolutionService.resolveEffectiveUserId(
          userId,
        );
      if (effectiveUserId === null) {
        return defaults;
      }

      const { defaultAgent } =
        await this.userPreferencesRepository.getForUser(effectiveUserId);
      if (defaultAgent === null) {
        return defaults;
      }

      const [agentEnabled, modelEnabled] = await Promise.all([
        this.disabledAgentClis.isEnabled(effectiveUserId, defaultAgent.backend),
        this.disabledAgentClis.isModelEnabled(
          effectiveUserId,
          defaultAgent.backend,
          defaultAgent.model,
        ),
      ]);
      if (!agentEnabled || !modelEnabled) {
        this.logger.debug(
          `${this.name}: default agent ${defaultAgent.backend}/${defaultAgent.model} is disabled; using system default`,
        );
        return defaults;
      }

      return applyDefaultAgentToRunConfig(defaults, defaultAgent);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.warn(
        `${this.name}: default agent lookup failed, using system default: ${message}`,
      );
      return defaults;
    }
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
    const clientId = readClientPlanId(input.id);

    if (!clientId.ok) {
      throw new BadRequestException('id must be a UUID.');
    }

    const fields = await this.resolvePlanCreateFields(input, userId);

    if (clientId.id === undefined) {
      return this.plansRepository.create(fields);
    }

    // Idempotent create (OT plan ca13e543): a caller that timed out re-sends the same id, and
    // gets back the plan its first call already wrote instead of a second one.
    const id = clientId.id;
    const replayed = await this.findReplayedPlan(id, fields.title);

    if (replayed) {
      return replayed;
    }

    try {
      return await this.plansRepository.create({ ...fields, id });
    } catch (error: unknown) {
      const winner = isUniqueViolation(error)
        ? await this.findReplayedPlan(id, fields.title)
        : undefined;

      if (winner) {
        return winner;
      }

      throw error;
    }
  }

  /**
   * @description The plan an earlier call with this client id created, or undefined when there is
   * none. An id already taken by a plan with another title is a client bug, not a replay.
   */
  private async findReplayedPlan(
    id: string,
    title: string,
  ): Promise<Plan | undefined> {
    const existing = await this.plansRepository.findOne({ where: { id } });

    if (!existing) {
      return undefined;
    }

    if (existing.title !== title) {
      throw new BadRequestException(
        `id ${id} already belongs to another plan.`,
      );
    }

    this.logger.debug(`${this.name}: replayed create for plan ${id}`);

    return existing;
  }

  /**
   * @description Atomically create many plans in one transaction. Every input is validated/normalized
   * up front (same rules as {@link createPlanFromInput}); a single bad input throws before anything is
   * persisted, and any DB failure rolls back the whole batch. Embedding happens off the write path (the
   * embeddings queue's entity subscriber). Returns saved plans in input order.
   */
  async createPlansFromInput(
    inputs: readonly CreatePlanInput[],
    userId?: string,
  ): Promise<Plan[]> {
    if (inputs.length === 0) return [];

    const fieldsList = await Promise.all(
      inputs.map((input) => this.resolvePlanCreateFields(input, userId)),
    );

    return this.dataSource.transaction(async (manager) => {
      const planRepo = manager.getRepository(Plan);
      const entities = fieldsList.map((fields) => planRepo.create(fields));

      return planRepo.save(entities);
    });
  }
}
