import { createMock } from '@golevelup/ts-vitest';
import { Test } from '@nestjs/testing';
import type { UserPreferencesData } from '@openthrottle/nestjs-repositories';
import {
  RolesService,
  USER_PREFERENCES_ERROR_REASONS,
  UserPreferencesService,
} from '@openthrottle/nestjs-repositories';
import { GraphQLError } from 'graphql';
import { beforeAll, beforeEach, describe, expect, test, vi } from 'vitest';

import { GqlPermissionsGuard } from '../../guards/gql-permissions.guard.ts';
import { WorkspaceEditorIdEnum } from '../workspace-settings/workspace-editor-id.enum.ts';
import { UserPreferencesResolver } from './user-preferences.resolver.ts';

describe('UserPreferencesResolver', () => {
  const userId = '11111111-1111-4111-8111-111111111111';

  const emptyPreferences: UserPreferencesData = {
    defaultAgent: null,
    defaultEditor: null,
    userId,
  };

  const savedPreferences: UserPreferencesData = {
    defaultAgent: { backend: 'claude', effort: 'high', model: 'opus' },
    defaultEditor: 'cursor',
    userId,
  };

  const mockUserPreferencesService = createMock<UserPreferencesService>({
    getForUser: vi.fn(),
    update: vi.fn(),
  });

  let resolver: UserPreferencesResolver;

  beforeAll(async () => {
    const app = await Test.createTestingModule({
      providers: [
        UserPreferencesResolver,
        GqlPermissionsGuard,
        {
          provide: UserPreferencesService,
          useValue: mockUserPreferencesService,
        },
        {
          provide: RolesService,
          useValue: createMock<RolesService>({
            getPermissionsForUser: vi.fn().mockResolvedValue([]),
          }),
        },
      ],
    }).compile();

    resolver = app.get(UserPreferencesResolver);
  });

  beforeEach(() => {
    vi.mocked(mockUserPreferencesService.getForUser).mockReset();
    vi.mocked(mockUserPreferencesService.update).mockReset();
  });

  describe('userPreferences', () => {
    test('reads the caller own row and maps it to the GraphQL shape', async () => {
      vi.mocked(mockUserPreferencesService.getForUser).mockResolvedValue(
        savedPreferences,
      );

      const result = await resolver.userPreferences(userId);

      expect(mockUserPreferencesService.getForUser).toHaveBeenCalledWith(
        userId,
      );
      expect(result).toEqual({
        defaultAgent: { backend: 'claude', effort: 'high', model: 'opus' },
        defaultEditor: WorkspaceEditorIdEnum.CURSOR,
      });
    });

    test('returns all-null fields when the user has no preferences', async () => {
      vi.mocked(mockUserPreferencesService.getForUser).mockResolvedValue(
        emptyPreferences,
      );

      const result = await resolver.userPreferences(userId);

      expect(result).toEqual({ defaultAgent: null, defaultEditor: null });
    });
  });

  describe('updateUserPreferences', () => {
    test('passes only provided fields to the service for the caller', async () => {
      vi.mocked(mockUserPreferencesService.update).mockResolvedValue({
        ok: true,
        preferences: { ...emptyPreferences, defaultEditor: 'cursor' },
      });

      const result = await resolver.updateUserPreferences(userId, {
        defaultEditor: WorkspaceEditorIdEnum.CURSOR,
      });

      expect(mockUserPreferencesService.update).toHaveBeenCalledWith(userId, {
        defaultEditor: 'cursor',
      });
      expect(result).toEqual({
        defaultAgent: null,
        defaultEditor: WorkspaceEditorIdEnum.CURSOR,
      });
    });

    test('sets a default agent, defaulting an omitted effort to null', async () => {
      vi.mocked(mockUserPreferencesService.update).mockResolvedValue({
        ok: true,
        preferences: {
          ...emptyPreferences,
          defaultAgent: { backend: 'claude', effort: null, model: 'opus' },
        },
      });

      const result = await resolver.updateUserPreferences(userId, {
        defaultAgent: { backend: 'claude', model: 'opus' },
      });

      expect(mockUserPreferencesService.update).toHaveBeenCalledWith(userId, {
        defaultAgent: { backend: 'claude', effort: null, model: 'opus' },
      });
      expect(result.defaultAgent).toEqual({
        backend: 'claude',
        effort: null,
        model: 'opus',
      });
    });

    test('forwards explicit nulls so both preferences are cleared', async () => {
      vi.mocked(mockUserPreferencesService.update).mockResolvedValue({
        ok: true,
        preferences: emptyPreferences,
      });

      const result = await resolver.updateUserPreferences(userId, {
        defaultAgent: null,
        defaultEditor: null,
      });

      expect(mockUserPreferencesService.update).toHaveBeenCalledWith(userId, {
        defaultAgent: null,
        defaultEditor: null,
      });
      expect(result).toEqual({ defaultAgent: null, defaultEditor: null });
    });

    test('an empty input leaves every preference unchanged', async () => {
      vi.mocked(mockUserPreferencesService.update).mockResolvedValue({
        ok: true,
        preferences: savedPreferences,
      });

      await resolver.updateUserPreferences(userId, {});

      expect(mockUserPreferencesService.update).toHaveBeenCalledWith(
        userId,
        {},
      );
    });

    test('a rejected patch becomes a BAD_USER_INPUT GraphQL error with its reason', async () => {
      vi.mocked(mockUserPreferencesService.update).mockResolvedValue({
        message: 'Unknown agent backend: nope',
        ok: false,
        reason: USER_PREFERENCES_ERROR_REASONS.invalidAgentBackend,
      });

      const pending = resolver.updateUserPreferences(userId, {
        defaultAgent: { backend: 'nope', model: 'x' },
      });

      await expect(pending).rejects.toBeInstanceOf(GraphQLError);
      await expect(pending).rejects.toMatchObject({
        extensions: { code: 'BAD_USER_INPUT', reason: 'INVALID_AGENT_BACKEND' },
        message: 'Unknown agent backend: nope',
      });
    });
  });
});
