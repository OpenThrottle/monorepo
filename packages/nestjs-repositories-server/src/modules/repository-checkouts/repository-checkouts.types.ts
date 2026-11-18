import type { CreateModelInput } from '@openthrottle/nestjs-postgres';
import type { BaseRepositoryMock } from '@openthrottle/nestjs-postgres/testing';
import type { Mock } from 'vitest';

import type { RepositoryCheckout } from './repository-checkout.entity.ts';
import type { REPOSITORY_CHECKOUT_KINDS } from './repository-checkouts.constants.ts';
import type { RepositoryCheckoutsRepository } from './repository-checkouts.repository.ts';

/**
 * @description One of {@link REPOSITORY_CHECKOUT_KINDS}.
 * @public
 */
export type RepositoryCheckoutKind = (typeof REPOSITORY_CHECKOUT_KINDS)[number];

/**
 * @description Scalar fields of a checkout that GraphQL objects and DTOs mirror.
 * @public
 */
export interface RepositoryCheckoutData {
  readonly displayName: string;
  readonly filesystemPath: string;
  readonly foreignSkillInjectionEnabled: boolean;
  readonly id: string;
  readonly kind: RepositoryCheckoutKind;
  readonly managed: boolean;
  readonly repositoryId: string;
  readonly scannedAt: Date | null;
  readonly userId: string;
  readonly worktreeSkillOverlayEnabled: boolean;
}

type RepositoryCheckoutDefaultedKeys =
  | 'foreignSkillInjectionEnabled'
  | 'inspection'
  | 'scannedAt'
  | 'worktreeSkillOverlayEnabled';

/**
 * @description What `RepositoryCheckoutsRepository.create` takes: the checkout's columns with the
 * relations left out and the nullable and database-defaulted columns optional.
 * @public
 */
export interface RepositoryCheckoutCreateInput
  extends
    Omit<
      CreateModelInput<RepositoryCheckout>,
      RepositoryCheckoutDefaultedKeys | 'repository' | 'user'
    >,
    Partial<
      Pick<
        CreateModelInput<RepositoryCheckout>,
        RepositoryCheckoutDefaultedKeys
      >
    > {}

/**
 * @description The fields {@link RepositoryCheckoutsRepository.createForUser} takes; the user
 * comes from the first argument, `kind` defaults to `primary` and `managed` to false.
 * @public
 */
export interface CreateRepositoryCheckoutData {
  readonly displayName: string;
  readonly filesystemPath: string;
  readonly kind?: RepositoryCheckoutKind;
  readonly managed?: boolean;
  readonly repositoryId: string;
}

/**
 * @description The fields {@link RepositoryCheckoutsRepository.upsertWorktreeCheckout} takes.
 * @public
 */
export interface UpsertWorktreeCheckoutData {
  readonly displayName: string;
  readonly filesystemPath: string;
  readonly repositoryId: string;
}

/**
 * @description A {@link RepositoryCheckoutsRepository} mock: every inherited `BaseRepository`
 * method plus the checkout ones.
 * @public
 */
export interface RepositoryCheckoutsRepositoryMock extends BaseRepositoryMock<
  RepositoryCheckout,
  RepositoryCheckoutCreateInput
> {
  readonly countByRepositoryId: Mock<
    RepositoryCheckoutsRepository['countByRepositoryId']
  >;
  readonly createForUser: Mock<RepositoryCheckoutsRepository['createForUser']>;
  readonly deleteWorktreeCheckout: Mock<
    RepositoryCheckoutsRepository['deleteWorktreeCheckout']
  >;
  readonly findAll: Mock<RepositoryCheckoutsRepository['findAll']>;
  readonly findAllWithForeignSkillInjectionEnabled: Mock<
    RepositoryCheckoutsRepository['findAllWithForeignSkillInjectionEnabled']
  >;
  readonly findByIdForUser: Mock<
    RepositoryCheckoutsRepository['findByIdForUser']
  >;
  readonly findByRepositoryIdForUser: Mock<
    RepositoryCheckoutsRepository['findByRepositoryIdForUser']
  >;
  readonly findByUserAndPath: Mock<
    RepositoryCheckoutsRepository['findByUserAndPath']
  >;
  readonly findCheckoutById: Mock<
    RepositoryCheckoutsRepository['findCheckoutById']
  >;
  readonly listByUserId: Mock<RepositoryCheckoutsRepository['listByUserId']>;
  readonly removeForUser: Mock<RepositoryCheckoutsRepository['removeForUser']>;
  readonly repointRepository: Mock<
    RepositoryCheckoutsRepository['repointRepository']
  >;
  readonly saveInspection: Mock<
    RepositoryCheckoutsRepository['saveInspection']
  >;
  readonly setForeignSkillInjectionEnabledForRepository: Mock<
    RepositoryCheckoutsRepository['setForeignSkillInjectionEnabledForRepository']
  >;
  readonly setWorktreeSkillOverlayEnabledForRepository: Mock<
    RepositoryCheckoutsRepository['setWorktreeSkillOverlayEnabledForRepository']
  >;
  readonly updateDisplayName: Mock<
    RepositoryCheckoutsRepository['updateDisplayName']
  >;
  readonly updateFilesystemPath: Mock<
    RepositoryCheckoutsRepository['updateFilesystemPath']
  >;
  readonly upsertWorktreeCheckout: Mock<
    RepositoryCheckoutsRepository['upsertWorktreeCheckout']
  >;
}
