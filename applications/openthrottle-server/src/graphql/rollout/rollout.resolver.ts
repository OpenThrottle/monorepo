/**
 * @description GraphQL resolver for rollout feature flags. Admin CRUD (rolloutFlags /
 * rolloutFlag / create / update / delete) is gated by RBAC flags permissions; myFeatureFlags
 * returns the evaluated flag set for the current actor.
 */

import { UseGuards } from '@nestjs/common';
import { Args, ID, Mutation, Query, Resolver } from '@nestjs/graphql';
import { CurrentUser } from '@openthrottle/nestjs-auth';
import type { AuthPrincipal } from '@openthrottle/nestjs-auth';
import { PERMISSIONS, Permissions } from '@openthrottle/nestjs-rbac';
import {
  ROLLOUT_FLAG_KIND,
  RolloutService,
} from '@openthrottle/nestjs-rollout';
import type { RolloutFlag } from '@openthrottle/nestjs-rollout';
import { GqlPermissionsGuard } from '../../guards/gql-permissions.guard';
import { FeatureFlagObject } from './feature-flag.object';
import { RolloutFlagObject } from './rollout-flag.object';
import {
  CreateRolloutFlagInput,
  UpdateRolloutFlagInput,
} from './rollout.input';

@Resolver(() => RolloutFlagObject)
@UseGuards(GqlPermissionsGuard)
export class RolloutResolver {
  constructor(private readonly rolloutService: RolloutService) {}

  @Query(() => [RolloutFlagObject], {
    description: `List all rollout feature flags`,
  })
  @Permissions(PERMISSIONS.FLAGS_READ)
  async rolloutFlags(): Promise<RolloutFlag[]> {
    return this.rolloutService.findAll();
  }

  @Query(() => RolloutFlagObject, {
    description: `Get a rollout feature flag by id`,
    nullable: true,
  })
  @Permissions(PERMISSIONS.FLAGS_READ)
  async rolloutFlag(
    @Args('id', { type: () => ID }) id: string,
  ): Promise<RolloutFlag | null> {
    return this.rolloutService.findById(id);
  }

  @Query(() => [FeatureFlagObject], {
    description: `Evaluated feature flags for the current actor`,
  })
  @Permissions(PERMISSIONS.FLAGS_READ)
  async myFeatureFlags(
    @CurrentUser() principal: AuthPrincipal,
  ): Promise<FeatureFlagObject[]> {
    const evaluations = await this.rolloutService.evaluateAll(principal);
    return evaluations.map((evaluation) => ({
      enabled:
        evaluation.kind === ROLLOUT_FLAG_KIND.BOOLEAN
          ? evaluation.value === true
          : evaluation.reason === 'fallthrough',
      key: evaluation.key,
    }));
  }

  @Mutation(() => RolloutFlagObject, {
    description: `Create a rollout feature flag`,
  })
  @Permissions(PERMISSIONS.FLAGS_WRITE)
  async createRolloutFlag(
    @Args('input', { type: () => CreateRolloutFlagInput })
    input: CreateRolloutFlagInput,
  ): Promise<RolloutFlag> {
    return this.rolloutService.create({
      description: input.description ?? null,
      enabled: input.enabled,
      key: input.key,
      targetRoles: input.targetRoles,
    });
  }

  @Mutation(() => RolloutFlagObject, {
    description: `Update a rollout feature flag`,
    nullable: true,
  })
  @Permissions(PERMISSIONS.FLAGS_WRITE)
  async updateRolloutFlag(
    @Args('input', { type: () => UpdateRolloutFlagInput })
    input: UpdateRolloutFlagInput,
  ): Promise<RolloutFlag | null> {
    return this.rolloutService.update(input.id, {
      ...(input.description !== undefined && {
        description: input.description,
      }),
      ...(input.enabled != null && { enabled: input.enabled }),
      ...(input.key != null && { key: input.key }),
      ...(input.targetRoles != null && { targetRoles: input.targetRoles }),
    });
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
