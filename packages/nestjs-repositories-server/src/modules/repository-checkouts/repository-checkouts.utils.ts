import { createBaseRepositoryMock } from '@openthrottle/nestjs-postgres/testing';
import { vi } from 'vitest';

import type { RepositoryCheckout } from './repository-checkout.entity.ts';
import type {
  RepositoryCheckoutCreateInput,
  RepositoryCheckoutsRepositoryMock,
} from './repository-checkouts.types.ts';

/**
 * @description Builds a {@link RepositoryCheckoutsRepositoryMock} that starts as an empty
 * `repository_checkouts` table (see `createBaseRepositoryMock`): no lists, no counts, nothing
 * found, nothing updated or removed. `createForUser` and `upsertWorktreeCheckout` have no default
 * answer and reject until stubbed. Provide it in place of `RepositoryCheckoutsRepository` and
 * stub per test. Test-only: imports `vitest`.
 * @public
 */
export function createRepositoryCheckoutsRepositoryMock(): RepositoryCheckoutsRepositoryMock {
  return {
    ...createBaseRepositoryMock<
      RepositoryCheckout,
      RepositoryCheckoutCreateInput
    >('repository_checkouts'),
    countByRepositoryId: vi.fn(async () => {
      return 0;
    }),
    createForUser: vi.fn(async () => {
      throw new Error(
        'createRepositoryCheckoutsRepositoryMock: stub createForUser before calling it',
      );
    }),
    deleteWorktreeCheckout: vi.fn(async () => {
      return false;
    }),
    findAll: vi.fn(async () => {
      return [];
    }),
    findAllWithForeignSkillInjectionEnabled: vi.fn(async () => {
      return [];
    }),
    findByIdForUser: vi.fn(async () => {
      return null;
    }),
    findByRepositoryIdForUser: vi.fn(async () => {
      return [];
    }),
    findByUserAndPath: vi.fn(async () => {
      return null;
    }),
    findCheckoutById: vi.fn(async () => {
      return null;
    }),
    listByUserId: vi.fn(async () => {
      return [];
    }),
    removeForUser: vi.fn(async () => {
      return false;
    }),
    repointRepository: vi.fn(async () => {
      return null;
    }),
    saveInspection: vi.fn(async () => {
      return null;
    }),
    setForeignSkillInjectionEnabledForRepository: vi.fn(async () => {
      return 0;
    }),
    setWorktreeSkillOverlayEnabledForRepository: vi.fn(async () => {
      return 0;
    }),
    updateDisplayName: vi.fn(async () => {
      return null;
    }),
    updateFilesystemPath: vi.fn(async () => {
      return null;
    }),
    upsertWorktreeCheckout: vi.fn(async () => {
      throw new Error(
        'createRepositoryCheckoutsRepositoryMock: stub upsertWorktreeCheckout before calling it',
      );
    }),
  };
}
