import type { CreateModelInput } from '@openthrottle/nestjs-postgres';
import type { BaseRepositoryMock } from '@openthrottle/nestjs-postgres/testing';
import type { Mock } from 'vitest';

import type { RepositoriesRepository } from './repositories.repository.ts';
import type { Repository } from './repository.entity.ts';

/**
 * @description Scalar fields of a repository that GraphQL objects and DTOs mirror.
 * @public
 */
export interface RepositoryData {
  readonly defaultBranch: string | null;
  readonly id: string;
  readonly name: string;
  readonly normalizedRemoteUrl: string | null;
  readonly projectId: string | null;
}

/**
 * @description The outcome of {@link RepositoriesRepository.mergeDetectedRemote}.
 * @public
 */
export interface MergeDetectedRemoteResult {
  /** True when the provisional row merged into an existing canonical row. */
  readonly merged: boolean;
  /** The surviving repository (canonical on merge, promoted otherwise). */
  readonly repository: Repository;
  /** Project link dropped from the provisional row on merge (canonical wins). */
  readonly supersededProjectId: string | null;
}

type RepositoryLedgerKeys =
  'ledgerHarvestCursor' | 'ledgerHarvestEnabled' | 'ledgerHarvestedAt';

/**
 * @description What `RepositoriesRepository.create` takes: the repository's columns with the
 * relation left out and the work-ledger harvest columns optional (the database defaults them).
 * Pass `normalizedRemoteUrl` null for a provisional local-only repository.
 * @public
 */
export interface RepositoryCreateInput
  extends
    Omit<CreateModelInput<Repository>, RepositoryLedgerKeys | 'project'>,
    Partial<Pick<CreateModelInput<Repository>, RepositoryLedgerKeys>> {}

/**
 * @description Fields {@link RepositoriesRepository.updateRepository} may change; an omitted
 * field is left as it is.
 * @public
 */
export interface UpdateRepositoryInput {
  readonly defaultBranch?: string | null;
  readonly name?: string;
  readonly normalizedRemoteUrl?: string | null;
  readonly projectId?: string | null;
}

/**
 * @description A {@link RepositoriesRepository} mock: every inherited `BaseRepository` method
 * plus the repository ones (`remove` cascades to checkouts in the real repository).
 * @public
 */
export interface RepositoriesRepositoryMock extends BaseRepositoryMock<
  Repository,
  RepositoryCreateInput
> {
  readonly findByNormalizedRemoteUrl: Mock<
    RepositoriesRepository['findByNormalizedRemoteUrl']
  >;
  readonly findOrCreateByRemoteUrl: Mock<
    RepositoriesRepository['findOrCreateByRemoteUrl']
  >;
  readonly findRepositoryById: Mock<
    RepositoriesRepository['findRepositoryById']
  >;
  readonly mergeDetectedRemote: Mock<
    RepositoriesRepository['mergeDetectedRemote']
  >;
  readonly removeRepository: Mock<RepositoriesRepository['removeRepository']>;
  readonly updateRepository: Mock<RepositoriesRepository['updateRepository']>;
}
