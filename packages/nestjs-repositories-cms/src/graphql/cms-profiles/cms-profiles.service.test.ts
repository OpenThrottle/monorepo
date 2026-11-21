/**
 * @description Unit tests for CmsProfilesService.resolveForUser: one profile per OpenThrottle user,
 * created on first use, restored when soft deleted, and keyed on the user id alone, so a deleted
 * user's profile is never handed to a new account that reuses their email.
 */

import { createMock } from '@golevelup/ts-vitest';
import type { Repository } from 'typeorm';
import { describe, expect, it, vi } from 'vitest';

import { Profile } from '../../modules/profiles/profile.entity.ts';
import { profilesFactory } from '../../modules/profiles/profiles.factory.ts';
import { CmsProfilesService } from './cms-profiles.service.ts';

const OLD_USER_ID = '0b9a4f1e-5c3d-4e2a-9f10-0000000000a1';
const NEW_USER_ID = '0b9a4f1e-5c3d-4e2a-9f10-0000000000a2';

const buildProfile = (overrides: Partial<Profile>): Profile => {
  return Object.assign(new Profile(), profilesFactory.build(), overrides);
};

const buildService = () => {
  const profiles = createMock<Repository<Profile>>();

  vi.mocked(profiles.create).mockImplementation((data) => {
    return Object.assign(new Profile(), data);
  });
  vi.mocked(profiles.save).mockImplementation(async (entity) => {
    return entity;
  });

  return { profiles, service: new CmsProfilesService(profiles) };
};

describe('CmsProfilesService', () => {
  describe('when the user already has a live profile', () => {
    it('returns it without writing', async () => {
      const { profiles, service } = buildService();
      const existing = buildProfile({ openthrottleUserId: OLD_USER_ID });

      vi.mocked(profiles.findOne).mockResolvedValue(existing);

      const resolved = await service.resolveForUser({
        email: 'someone@example.test',
        kind: 'user',
        userId: OLD_USER_ID,
      });

      expect(resolved).toBe(existing);
      expect(profiles.findOne).toHaveBeenCalledWith({
        where: { openthrottleUserId: OLD_USER_ID },
      });
      expect(profiles.save).not.toHaveBeenCalled();
    });
  });

  describe('when the user has no profile yet', () => {
    it('creates one linked to the user id', async () => {
      const { profiles, service } = buildService();

      vi.mocked(profiles.findOne).mockResolvedValue(null);

      const resolved = await service.resolveForUser({
        email: 'someone@example.test',
        kind: 'user',
        userId: NEW_USER_ID,
      });

      expect(resolved.openthrottleUserId).toBe(NEW_USER_ID);
      expect(resolved.email).toBe('someone@example.test');
      expect(profiles.save).toHaveBeenCalledTimes(1);
    });

    it('uses a reserved placeholder email when the user has none', async () => {
      const { profiles, service } = buildService();

      vi.mocked(profiles.findOne).mockResolvedValue(null);

      const resolved = await service.resolveForUser({
        email: null,
        kind: 'user',
        userId: NEW_USER_ID,
      });

      expect(resolved.email).toBe(`${NEW_USER_ID}@openthrottle.invalid`);
    });
  });

  describe('when the profile was soft deleted', () => {
    it('restores the same row', async () => {
      const { profiles, service } = buildService();
      const existing = buildProfile({
        isDeleted: true,
        openthrottleUserId: OLD_USER_ID,
      });

      vi.mocked(profiles.findOne).mockResolvedValue(existing);

      const resolved = await service.resolveForUser({
        email: null,
        kind: 'user',
        userId: OLD_USER_ID,
      });

      expect(resolved.uuid).toBe(existing.uuid);
      expect(resolved.isDeleted).toBe(false);
      expect(profiles.save).toHaveBeenCalledWith(existing);
    });
  });

  describe('when an OpenThrottle user was deleted and a new account reuses their email', () => {
    it('gives the new account its own profile and leaves the old link untouched', async () => {
      const { profiles, service } = buildService();
      const deletedUsersProfile = buildProfile({
        email: 'reused@example.test',
        openthrottleUserId: OLD_USER_ID,
      });

      // Lookups are by user id only: the new id has no profile, whatever its email.
      vi.mocked(profiles.findOne).mockResolvedValue(null);

      const resolved = await service.resolveForUser({
        email: 'reused@example.test',
        kind: 'user',
        userId: NEW_USER_ID,
      });

      expect(profiles.findOne).toHaveBeenCalledWith({
        where: { openthrottleUserId: NEW_USER_ID },
      });
      expect(resolved.openthrottleUserId).toBe(NEW_USER_ID);
      expect(profiles.save).not.toHaveBeenCalledWith(deletedUsersProfile);
      expect(deletedUsersProfile.openthrottleUserId).toBe(OLD_USER_ID);
      expect(deletedUsersProfile.isDeleted).toBe(false);
    });
  });

  describe('when a concurrent first write wins the unique index', () => {
    it('re-reads and returns the winner', async () => {
      const { profiles, service } = buildService();
      const winner = buildProfile({ openthrottleUserId: NEW_USER_ID });

      vi.mocked(profiles.findOne)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(winner);
      vi.mocked(profiles.save).mockRejectedValueOnce(
        Object.assign(new Error('duplicate key'), { code: '23505' }),
      );

      const resolved = await service.resolveForUser({
        email: null,
        kind: 'user',
        userId: NEW_USER_ID,
      });

      expect(resolved).toBe(winner);
    });

    it('rethrows any other error', async () => {
      const { profiles, service } = buildService();

      vi.mocked(profiles.findOne).mockResolvedValue(null);
      vi.mocked(profiles.save).mockRejectedValueOnce(new Error('boom'));

      await expect(
        service.resolveForUser({
          email: null,
          kind: 'user',
          userId: NEW_USER_ID,
        }),
      ).rejects.toThrow('boom');
    });
  });
});
