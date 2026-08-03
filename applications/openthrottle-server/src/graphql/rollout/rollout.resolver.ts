/**
 * @description GraphQL resolver for rollout feature flags. Admin CRUD (rolloutFlags /
 * rolloutFlag / create / update / delete) is gated by RBAC flags permissions.
 * Public client hydration uses evaluateFeatureFlags (no flags:read); myFeatureFlags
 * remains as a deprecated flags:read alias.
 */

import { UseGuards } from '@nestjs/common';
import { Args, ID, Mutation, Query, Resolver } from '@nestjs/graphql';
import { CurrentUser, Public } from '@openthrottle/nestjs-auth';
import type { AuthPrincipal } from '@openthrottle/nestjs-auth';
import { LoggerService } from '@openthrottle/nestjs-modules';
import { PERMISSIONS, Permissions } from '@openthrottle/nestjs-rbac';
import { RolloutService } from '@openthrottle/nestjs-rollout';
import { GqlPermissionsGuard } from '../../guards/gql-permissions.guard';
import { FeatureFlagObject } from './feature-flag.object';
import { resolveEvaluationPrincipal } from './resolve-evaluation-principal';
import { RolloutFlagObject } from './rollout-flag.object';
import {
  CreateRolloutFlagInput,
  UpdateRolloutFlagInput,
} from './rollout.input';
import {
  toDomainCreateInput,
  toDomainUpdatePatch,
  toFeatureFlagObject,
  toRolloutFlagObject,
} from './rollout.mapper';

@Resolver(() => RolloutFlagObject)
@UseGuards(GqlPermissionsGuard)
export class RolloutResolver {
  constructor(
    private readonly logger: LoggerService,
    private readonly rolloutService: RolloutService,
  ) {}

  @Query(() => [RolloutFlagObject], {
    description: `List all rollout feature flags`,
  })
  @Permissions(PERMISSIONS.FLAGS_READ)
  async rolloutFlags(): Promise<RolloutFlagObject[]> {
    const flags = await this.rolloutService.findAll();
    return flags.map(toRolloutFlagObject);
  }

  @Query(() => RolloutFlagObject, {
    description: `Get a rollout feature flag by id`,
    nullable: true,
  })
  @Permissions(PERMISSIONS.FLAGS_READ)
  async rolloutFlag(
    @Args('id', { type: () => ID }) id: string,
  ): Promise<RolloutFlagObject | null> {
    const flag = await this.rolloutService.findById(id);
    return flag == null ? null : toRolloutFlagObject(flag);
  }

  @Public()
  @Query(() => [FeatureFlagObject], {
    description: `Evaluated rollout flags for client hydration. Public: no flags:read. Authenticated principal enriches targeting/bucketing when present; otherwise anonymousId (or a degraded shared subject) is used for bucketing. applicationKey is accepted for future app scoping (log/stub today).`,
  })
  async evaluateFeatureFlags(
    @Args('anonymousId', { nullable: true, type: () => String })
    anonymousId: string | null,
    @Args('applicationKey', { nullable: true, type: () => String })
    applicationKey: string | null,
    @CurrentUser() principal: AuthPrincipal | undefined,
  ): Promise<FeatureFlagObject[]> {
    if (applicationKey != null && applicationKey.trim() !== '') {
      this.logger.debug(
        `evaluateFeatureFlags applicationKey=${applicationKey.trim()} (scoping stub until app UUID mapping)`,
        RolloutResolver.name,
      );
    }

    const evaluationPrincipal = resolveEvaluationPrincipal(
      principal,
      anonymousId,
    );
    const evaluations =
      await this.rolloutService.evaluateAll(evaluationPrincipal);
    return evaluations.map(toFeatureFlagObject);
  }

  @Query(() => [FeatureFlagObject], {
    deprecationReason: `Use evaluateFeatureFlags (public hydration; no flags:read). Auth remains enrichment for targeting.`,
    description: `Deprecated: evaluated feature flags for the current actor (kind + valueJson). Prefer evaluateFeatureFlags.`,
  })
  @Permissions(PERMISSIONS.FLAGS_READ)
  async myFeatureFlags(
    @CurrentUser() principal: AuthPrincipal,
  ): Promise<FeatureFlagObject[]> {
    const evaluations = await this.rolloutService.evaluateAll(principal);
    return evaluations.map(toFeatureFlagObject);
  }

  @Mutation(() => RolloutFlagObject, {
    description: `Create a rollout feature flag`,
  })
  @Permissions(PERMISSIONS.FLAGS_WRITE)
  async createRolloutFlag(
    @Args('input', { type: () => CreateRolloutFlagInput })
    input: CreateRolloutFlagInput,
  ): Promise<RolloutFlagObject> {
    const flag = await this.rolloutService.create(toDomainCreateInput(input));
    return toRolloutFlagObject(flag);
  }

  @Mutation(() => RolloutFlagObject, {
    description: `Update a rollout feature flag`,
    nullable: true,
  })
  @Permissions(PERMISSIONS.FLAGS_WRITE)
  async updateRolloutFlag(
    @Args('input', { type: () => UpdateRolloutFlagInput })
    input: UpdateRolloutFlagInput,
  ): Promise<RolloutFlagObject | null> {
    const flag = await this.rolloutService.update(
      input.id,
      toDomainUpdatePatch(input),
    );
    return flag == null ? null : toRolloutFlagObject(flag);
  }

  @Mutation(() => Boolean, {
    description: `Delete a rollout feature flag`,
  })
  @Permissions(PERMISSIONS.FLAGS_WRITE)
  async deleteRolloutFlag(
    @Args('id', { type: () => ID }) id: string,
  ): Promise<boolean> {
    return this.rolloutService.remove(id);
  }
}
