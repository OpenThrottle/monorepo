import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import type { AuthPrincipal } from '@openthrottle/nestjs-auth';
import {
  AUTH_PRINCIPAL_KIND_SERVICE_ACCOUNT,
  AUTH_PRINCIPAL_KIND_USER,
} from '@openthrottle/nestjs-auth';
import {
  AgentConversationGroupsRepository,
  RolesRepository,
} from '@openthrottle/nestjs-repositories-server';
import {
  agentConversationGroupsFactory,
  createAgentConversationGroupsRepositoryMock,
  createRolesRepositoryMock,
} from '@openthrottle/nestjs-repositories-server/testing';
import { GraphQLError } from 'graphql';
import { beforeAll, beforeEach, describe, expect, test } from 'vitest';

import { GqlPermissionsGuard } from '../../guards/gql-permissions.guard.ts';
import { AgentConversationGroupsResolver } from './agent-conversation-groups.resolver.ts';

describe('AgentConversationGroupsResolver', () => {
  let resolver: AgentConversationGroupsResolver;

  const humanPrincipal: AuthPrincipal = {
    kind: AUTH_PRINCIPAL_KIND_USER,
    sub: 'user-id',
  };
  const serviceAccountPrincipal: AuthPrincipal = {
    kind: AUTH_PRINCIPAL_KIND_SERVICE_ACCOUNT,
    sub: 'sa-id',
  };

  const group = agentConversationGroupsFactory.build({
    id: '11111111-1111-4111-8111-111111111111',
    name: 'Work',
    sortOrder: 1000,
    userId: humanPrincipal.sub,
  });

  const groupsRepository = createAgentConversationGroupsRepositoryMock();
  const mockRolesRepository = createRolesRepositoryMock();
  mockRolesRepository.getPermissionsForUser.mockResolvedValue([
    'settings:read',
    'settings:write',
  ]);

  beforeAll(async () => {
    const app = await Test.createTestingModule({
      providers: [
        AgentConversationGroupsResolver,
        {
          provide: AgentConversationGroupsRepository,
          useValue: groupsRepository,
        },
        { provide: RolesRepository, useValue: mockRolesRepository },
        GqlPermissionsGuard,
      ],
    }).compile();

    resolver = app.get(AgentConversationGroupsResolver);
  });

  beforeEach(() => {
    groupsRepository.createGroup.mockClear();
    groupsRepository.renameGroup.mockClear();
    groupsRepository.deleteGroup.mockClear();
    groupsRepository.reorderGroups.mockClear();
  });

  describe('listAgentConversationGroups', () => {
    test("lists the caller's groups", async () => {
      groupsRepository.listGroupsForUser.mockResolvedValueOnce([group]);

      const result = await resolver.listAgentConversationGroups(humanPrincipal);

      expect(groupsRepository.listGroupsForUser).toHaveBeenCalledWith(
        humanPrincipal.sub,
      );
      expect(result).toEqual([
        expect.objectContaining({
          id: group.id,
          name: 'Work',
          sortOrder: 1000,
        }),
      ]);
    });

    test('rejects a non-human principal', async () => {
      await expect(
        resolver.listAgentConversationGroups(serviceAccountPrincipal),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });
  });

  describe('createAgentConversationGroup', () => {
    test('creates with the trimmed name for the caller', async () => {
      groupsRepository.createGroup.mockResolvedValueOnce(group);

      await resolver.createAgentConversationGroup(humanPrincipal, {
        name: '  Work  ',
      });

      expect(groupsRepository.createGroup).toHaveBeenCalledWith(
        humanPrincipal.sub,
        'Work',
      );
    });

    test('rejects an empty name with BAD_USER_INPUT', async () => {
      const attempt = resolver.createAgentConversationGroup(humanPrincipal, {
        name: '   ',
      });

      await expect(attempt).rejects.toBeInstanceOf(GraphQLError);
      await expect(attempt).rejects.toMatchObject({
        extensions: { code: 'BAD_USER_INPUT' },
      });
      expect(groupsRepository.createGroup).not.toHaveBeenCalled();
    });

    test('rejects a name over 80 characters', async () => {
      await expect(
        resolver.createAgentConversationGroup(humanPrincipal, {
          name: 'a'.repeat(81),
        }),
      ).rejects.toBeInstanceOf(GraphQLError);
    });
  });

  describe('renameAgentConversationGroup', () => {
    test('renames an owned group with the trimmed name', async () => {
      groupsRepository.renameGroup.mockResolvedValueOnce(group);

      await resolver.renameAgentConversationGroup(humanPrincipal, {
        groupId: group.id,
        name: ' Docs ',
      });

      expect(groupsRepository.renameGroup).toHaveBeenCalledWith(
        humanPrincipal.sub,
        group.id,
        'Docs',
      );
    });

    test('rejects an invalid name before touching the repository', async () => {
      await expect(
        resolver.renameAgentConversationGroup(humanPrincipal, {
          groupId: group.id,
          name: '',
        }),
      ).rejects.toBeInstanceOf(GraphQLError);
      expect(groupsRepository.renameGroup).not.toHaveBeenCalled();
    });

    test("propagates NotFoundException for a group that is not the caller's", async () => {
      await expect(
        resolver.renameAgentConversationGroup(humanPrincipal, {
          groupId: group.id,
          name: 'X',
        }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('deleteAgentConversationGroup', () => {
    test('deletes scoped to the caller', async () => {
      groupsRepository.deleteGroup.mockResolvedValueOnce(group);

      const result = await resolver.deleteAgentConversationGroup(
        humanPrincipal,
        { groupId: group.id },
      );

      expect(groupsRepository.deleteGroup).toHaveBeenCalledWith(
        humanPrincipal.sub,
        group.id,
      );
      expect(result.id).toBe(group.id);
    });
  });

  describe('reorderAgentConversationGroup', () => {
    test('passes the ordered ids and returns the groups', async () => {
      groupsRepository.reorderGroups.mockResolvedValueOnce([group]);

      const result = await resolver.reorderAgentConversationGroup(
        humanPrincipal,
        { groupIds: [group.id] },
      );

      expect(groupsRepository.reorderGroups).toHaveBeenCalledWith(
        humanPrincipal.sub,
        [group.id],
      );
      expect(result).toHaveLength(1);
    });
  });
});
