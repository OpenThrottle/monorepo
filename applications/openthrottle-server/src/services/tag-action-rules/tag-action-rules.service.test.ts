import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { TagActionRulesRepository } from '@openthrottle/nestjs-repositories-server';
import type { TagActionRulesRepositoryMock } from '@openthrottle/nestjs-repositories-server/testing';
import {
  createTagActionRulesRepositoryMock,
  tagActionRulesFactory,
} from '@openthrottle/nestjs-repositories-server/testing';
import { beforeEach, describe, expect, it } from 'vitest';

import { TagActionRulesService } from './tag-action-rules.service.ts';

const userId = '22222222-2222-4222-8222-222222222222';
const injectPayload = { placement: 'first', skillSlug: 'grilling' };

describe('TagActionRulesService', () => {
  let repository: TagActionRulesRepositoryMock;
  let service: TagActionRulesService;

  beforeEach(async () => {
    repository = createTagActionRulesRepositoryMock();
    const app = await Test.createTestingModule({
      providers: [
        TagActionRulesService,
        { provide: TagActionRulesRepository, useValue: repository },
      ],
    }).compile();
    service = app.get(TagActionRulesService);
  });

  describe('upsertRule validation', () => {
    it('rejects an unknown action type', async () => {
      await expect(
        service.upsertRule(userId, {
          actionPayload: {},
          actionType: 'nope',
          title: 'x',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects a blank title', async () => {
      await expect(
        service.upsertRule(userId, {
          actionPayload: injectPayload,
          actionType: 'inject-task',
          title: '   ',
        }),
      ).rejects.toThrow('Rule title must not be empty.');
    });

    it('maps a payload that fails the schema to BadRequest', async () => {
      await expect(
        service.upsertRule(userId, {
          actionPayload: { placement: 'sideways' },
          actionType: 'inject-task',
          title: 'x',
        }),
      ).rejects.toThrow(/Invalid inject-task payload/);
    });
  });

  describe('upsertRule create', () => {
    it('creates an enabled rule owned by the user with a trimmed title', async () => {
      const created = tagActionRulesFactory.build({ userId });
      repository.create.mockResolvedValue(created);

      await expect(
        service.upsertRule(userId, {
          actionPayload: injectPayload,
          actionType: 'inject-task',
          tagAll: ['backend'],
          title: '  Review  ',
        }),
      ).resolves.toBe(created);
      expect(repository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          enabled: true,
          environment: null,
          projectId: null,
          repositoryId: null,
          status: null,
          tagAll: ['backend'],
          title: 'Review',
          userId,
        }),
      );
    });
  });

  describe('upsertRule update', () => {
    it('updates the owner rule and keeps its enabled flag when unset', async () => {
      const existing = tagActionRulesFactory.build({
        enabled: false,
        userId,
      });
      const updated = { ...existing, title: 'Renamed' };
      repository.findForUser.mockResolvedValue(existing);
      repository.update.mockResolvedValue(updated);

      await expect(
        service.upsertRule(userId, {
          actionPayload: injectPayload,
          actionType: 'inject-task',
          id: existing.id,
          title: 'Renamed',
        }),
      ).resolves.toBe(updated);
      expect(repository.findForUser).toHaveBeenCalledWith(userId, existing.id);
      expect(repository.update).toHaveBeenCalledWith(
        existing.id,
        expect.objectContaining({ enabled: false, title: 'Renamed' }),
      );
    });

    it('404s when the rule is absent or owned by someone else', async () => {
      await expect(
        service.upsertRule(userId, {
          actionPayload: injectPayload,
          actionType: 'inject-task',
          id: 'missing',
          title: 'x',
        }),
      ).rejects.toThrow(NotFoundException);
      expect(repository.update).not.toHaveBeenCalled();
    });
  });
});
