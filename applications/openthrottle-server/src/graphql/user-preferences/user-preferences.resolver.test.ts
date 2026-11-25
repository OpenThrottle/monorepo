import { Test } from '@nestjs/testing';
import type { UserPreferencesData } from '@openthrottle/nestjs-repositories-server';
import {
  RolesRepository,
  USER_PREFERENCES_ERROR_REASONS,
  UserPreferencesRepository,
} from '@openthrottle/nestjs-repositories-server';
import {
  createRolesRepositoryMock,
  createUserPreferencesRepositoryMock,
} from '@openthrottle/nestjs-repositories-server/testing';
import { asMock } from '@openthrottle/nestjs-testing';
import { GraphQLError } from 'graphql';
import { beforeAll, beforeEach, describe, expect, test, vi } from 'vitest';

import { GqlPermissionsGuard } from '../../guards/gql-permissions.guard.ts';
import { WORKSPACE_EDITOR_ID } from '../workspace-settings/workspace-editor-id.enum.ts';
import { UserPreferencesResolver } from './user-preferences.resolver.ts';

describe('UserPreferencesResolver', () => {
  const userId = '11111111-1111-4111-8111-111111111111';

  const emptyPreferences: UserPreferencesData = {
    defaultAgent: null,
    defaultEditor: null,
    userId,
  };

  const savedPreferences: UserPreferencesData = {
    defaultAgent: { driver: 'claude', effort: 'high', model: 'opus' },
    defaultEditor: 'cursor',
    userId,
  };

  const mockUserPreferencesRepository = asMock<UserPreferencesRepository>(
    createUserPreferencesRepositoryMock(),
  );

  let resolver: UserPreferencesResolver;

  beforeAll(async () => {
    const app = await Test.createTestingModule({
      providers: [
        UserPreferencesResolver,
        GqlPermissionsGuard,
        {
          provide: UserPreferencesRepository,
          useValue: mockUserPreferencesRepository,
        },
        { provide: RolesRepository, useValue: createRolesRepositoryMock() },
      ],
    }).compile();

    resolver = app.get(UserPreferencesResolver);
  });

  beforeEach(() => {
    vi.mocked(mockUserPreferencesRepository.getForUser).mockReset();
    vi.mocked(mockUserPreferencesRepository.update).mockReset();
  });

  describe('userPreferences', () => {
    test('reads the caller own row and maps it to the GraphQL shape', async () => {
      vi.mocked(mockUserPreferencesRepository.getForUser).mockResolvedValue(
        savedPreferences,
      );

      const result = await resolver.userPreferences(userId);

      expect(mockUserPreferencesRepository.getForUser).toHaveBeenCalledWith(
        userId,
      );
      expect(result).toEqual({
        defaultAgent: { driver: 'claude', effort: 'high', model: 'opus' },
        defaultEditor: WORKSPACE_EDITOR_ID.CURSOR,
      });
    });

    test('returns all-null fields when the user has no preferences', async () => {
      vi.mocked(mockUserPreferencesRepository.getForUser).mockResolvedValue(
        emptyPreferences,
      );

      const result = await resolver.userPreferences(userId);

      expect(result).toEqual({ defaultAgent: null, defaultEditor: null });
    });
  });

  describe('updateUserPreferences', () => {
    test('passes only provided fields to the service for the caller', async () => {
      vi.mocked(mockUserPreferencesRepository.update).mockResolvedValue({
        ok: true,
        preferences: { ...emptyPreferences, defaultEditor: 'cursor' },
      });

      const result = await resolver.updateUserPreferences(userId, {
        defaultEditor: WORKSPACE_EDITOR_ID.CURSOR,
      });

      expect(mockUserPreferencesRepository.update).toHaveBeenCalledWith(
        userId,
        {
          defaultEditor: 'cursor',
        },
      );
      expect(result).toEqual({
        defaultAgent: null,
        defaultEditor: WORKSPACE_EDITOR_ID.CURSOR,
      });
    });

    test('sets a default agent, defaulting an omitted effort to null', async () => {
      vi.mocked(mockUserPreferencesRepository.update).mockResolvedValue({
        ok: true,
        preferences: {
          ...emptyPreferences,
          defaultAgent: { driver: 'claude', effort: null, model: 'opus' },
        },
      });

      const result = await resolver.updateUserPreferences(userId, {
        defaultAgent: { driver: 'claude', model: 'opus' },
      });

      expect(mockUserPreferencesRepository.update).toHaveBeenCalledWith(
        userId,
        {
          defaultAgent: { driver: 'claude', effort: null, model: 'opus' },
        },
      );
      expect(result.defaultAgent).toEqual({
        driver: 'claude',
        effort: null,
        model: 'opus',
      });
    });

    test('forwards explicit nulls so both preferences are cleared', async () => {
      vi.mocked(mockUserPreferencesRepository.update).mockResolvedValue({
        ok: true,
        preferences: emptyPreferences,
      });

      const result = await resolver.updateUserPreferences(userId, {
        defaultAgent: null,
        defaultEditor: null,
      });

      expect(mockUserPreferencesRepository.update).toHaveBeenCalledWith(
        userId,
        {
          defaultAgent: null,
          defaultEditor: null,
        },
      );
      expect(result).toEqual({ defaultAgent: null, defaultEditor: null });
    });

    test('an empty input leaves every preference unchanged', async () => {
      vi.mocked(mockUserPreferencesRepository.update).mockResolvedValue({
        ok: true,
        preferences: savedPreferences,
      });

      await resolver.updateUserPreferences(userId, {});

      expect(mockUserPreferencesRepository.update).toHaveBeenCalledWith(
        userId,
        {},
      );
    });

    test('a rejected patch becomes a BAD_USER_INPUT GraphQL error with its reason', async () => {
      vi.mocked(mockUserPreferencesRepository.update).mockResolvedValue({
        message: 'Unknown agent driver: nope',
        ok: false,
        reason: USER_PREFERENCES_ERROR_REASONS.invalidAgentDriver,
      });

      const pending = resolver.updateUserPreferences(userId, {
        defaultAgent: { driver: 'nope', model: 'x' },
      });

      await expect(pending).rejects.toBeInstanceOf(GraphQLError);
      await expect(pending).rejects.toMatchObject({
        extensions: { code: 'BAD_USER_INPUT', reason: 'INVALID_AGENT_DRIVER' },
        message: 'Unknown agent driver: nope',
      });
    });
  });
});
