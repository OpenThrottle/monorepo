/**
 * @description GraphQL resolver for rollout feature flags. Admin CRUD (rolloutFlags /
 * rolloutFlag / create / update / delete) is gated by RBAC flags permissions; myFeatureFlags
 * returns typed evaluations (kind + valueJson) for the current actor.
 */

import { UseGuards } from '@nestjs/common';
import { Args, ID, Mutation, Query, Resolver } from '@nestjs/graphql';
import { CurrentUser } from '@openthrottle/nestjs-auth';
import type { AuthPrincipal } from '@openthrottle/nestjs-auth';
import { PERMISSIONS, Permissions } from '@openthrottle/nestjs-rbac';
import { RolloutService } from '@openthrottle/nestjs-rollout';
import { GqlPermissionsGuard } from '../../guards/gql-permissions.guard';
import { FeatureFlagObject } from './feature-flag.object';
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
  constructor(private readonly rolloutService: RolloutService) {}

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

  @Query(() => [FeatureFlagObject], {
    description: `Evaluated feature flags for the current actor (kind + valueJson)`,
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
