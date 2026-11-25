/**
 * @description GraphQL resolver for user-defined agent conversation groups (human JWT
 * user-scoped).
 */

import { UseGuards } from '@nestjs/common';
import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import type { AuthPrincipal } from '@openthrottle/nestjs-auth';
import { CurrentUser } from '@openthrottle/nestjs-auth';
import { PERMISSIONS, Permissions } from '@openthrottle/nestjs-rbac';
import { AgentConversationGroupsRepository } from '@openthrottle/nestjs-repositories-server';

import { GqlPermissionsGuard } from '../../guards/gql-permissions.guard.ts';
import { assertHumanAuthPrincipal } from '../service-accounts/service-accounts.utils.ts';
import {
  CreateAgentConversationGroupInput,
  DeleteAgentConversationGroupInput,
  RenameAgentConversationGroupInput,
  ReorderAgentConversationGroupInput,
} from './agent-conversation-group.input.ts';
import {
  parseAgentConversationGroupName,
  toAgentConversationGroupObject,
} from './agent-conversation-group.mapper.ts';
import { AgentConversationGroupObject } from './agent-conversation-group.object.ts';

@Resolver(() => AgentConversationGroupObject)
@UseGuards(GqlPermissionsGuard)
export class AgentConversationGroupsResolver {
  constructor(
    private readonly agentConversationGroupsRepository: AgentConversationGroupsRepository,
  ) {}

  @Query(() => [AgentConversationGroupObject], {
    description: `List the authenticated human user's conversation groups in sidebar order (sortOrder ascending).`,
  })
  @Permissions(PERMISSIONS.SETTINGS_READ)
  async listAgentConversationGroups(
    @CurrentUser() principal: AuthPrincipal | undefined,
  ): Promise<AgentConversationGroupObject[]> {
    const user = assertHumanAuthPrincipal(principal);

    const groups =
      await this.agentConversationGroupsRepository.listGroupsForUser(user.sub);

    return groups.map(toAgentConversationGroupObject);
  }

  @Mutation(() => AgentConversationGroupObject, {
    description: `Create a conversation group at the end of the caller's list. The name is trimmed and must be 1 to 80 characters (BAD_USER_INPUT otherwise).`,
  })
  @Permissions(PERMISSIONS.SETTINGS_WRITE)
  async createAgentConversationGroup(
    @CurrentUser() principal: AuthPrincipal | undefined,
    @Args('input', { type: () => CreateAgentConversationGroupInput })
    input: CreateAgentConversationGroupInput,
  ): Promise<AgentConversationGroupObject> {
    const user = assertHumanAuthPrincipal(principal);
    const name = parseAgentConversationGroupName(input.name);

    const group = await this.agentConversationGroupsRepository.createGroup(
      user.sub,
      name,
    );

    return toAgentConversationGroupObject(group);
  }

  @Mutation(() => AgentConversationGroupObject, {
    description: `Rename an owned conversation group. The name is trimmed and must be 1 to 80 characters (BAD_USER_INPUT otherwise).`,
  })
  @Permissions(PERMISSIONS.SETTINGS_WRITE)
  async renameAgentConversationGroup(
    @CurrentUser() principal: AuthPrincipal | undefined,
    @Args('input', { type: () => RenameAgentConversationGroupInput })
    input: RenameAgentConversationGroupInput,
  ): Promise<AgentConversationGroupObject> {
    const user = assertHumanAuthPrincipal(principal);
    const name = parseAgentConversationGroupName(input.name);

    const group = await this.agentConversationGroupsRepository.renameGroup(
      user.sub,
      input.groupId,
      name,
    );

    return toAgentConversationGroupObject(group);
  }

  @Mutation(() => AgentConversationGroupObject, {
    description: `Delete an owned conversation group. Its conversations are kept and become ungrouped. Returns the deleted group.`,
  })
  @Permissions(PERMISSIONS.SETTINGS_WRITE)
  async deleteAgentConversationGroup(
    @CurrentUser() principal: AuthPrincipal | undefined,
    @Args('input', { type: () => DeleteAgentConversationGroupInput })
    input: DeleteAgentConversationGroupInput,
  ): Promise<AgentConversationGroupObject> {
    const user = assertHumanAuthPrincipal(principal);

    const group = await this.agentConversationGroupsRepository.deleteGroup(
      user.sub,
      input.groupId,
    );

    return toAgentConversationGroupObject(group);
  }

  @Mutation(() => [AgentConversationGroupObject], {
    description: `Reorder the caller's conversation groups. groupIds must list every group exactly once; returns them in the new order.`,
  })
  @Permissions(PERMISSIONS.SETTINGS_WRITE)
  async reorderAgentConversationGroup(
    @CurrentUser() principal: AuthPrincipal | undefined,
    @Args('input', { type: () => ReorderAgentConversationGroupInput })
    input: ReorderAgentConversationGroupInput,
  ): Promise<AgentConversationGroupObject[]> {
    const user = assertHumanAuthPrincipal(principal);

    const groups = await this.agentConversationGroupsRepository.reorderGroups(
      user.sub,
      input.groupIds,
    );

    return groups.map(toAgentConversationGroupObject);
  }
}
