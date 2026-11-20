import type { CreateModelInput } from '@openthrottle/nestjs-postgres';
import type { BaseRepositoryMock } from '@openthrottle/nestjs-postgres/testing';
import type { Mock } from 'vitest';

import type { ServiceAccountCredential } from './service-account-credential.entity.ts';
import type { ServiceAccountCredentialsRepository } from './service-account-credentials.repository.ts';

/**
 * Scalar/column fields of ServiceAccountCredential (no relations).
 * @public
 */
export type ServiceAccountCredentialData = Pick<
  ServiceAccountCredential,
  | 'createdAt'
  | 'expiresAt'
  | 'id'
  | 'label'
  | 'lastUsedAt'
  | 'prefix'
  | 'revokedAt'
  | 'scopes'
  | 'secretHash'
  | 'serviceAccountId'
>;

/**
 * @description What `ServiceAccountCredentialsRepository.create` takes: the credential's
 * columns, with the service-account relation left out and the nullable columns optional.
 * `prefix`, `secretHash` and `serviceAccountId` are required.
 * @public
 */
export interface ServiceAccountCredentialCreateInput
  extends
    Omit<
      CreateModelInput<ServiceAccountCredential>,
      | 'expiresAt'
      | 'label'
      | 'lastUsedAt'
      | 'revokedAt'
      | 'scopes'
      | 'serviceAccount'
    >,
    Partial<
      Pick<
        CreateModelInput<ServiceAccountCredential>,
        'expiresAt' | 'label' | 'lastUsedAt' | 'revokedAt' | 'scopes'
      >
    > {}

/**
 * @description Result of a successful `verifyBearerToken`. `scopes` is the credential's
 * allow-list, or null when it is unrestricted.
 * @public
 */
export type VerifiedServiceAccountCredential = {
  readonly credentialId: string;
  readonly scopes: readonly string[] | null;
  readonly serviceAccountId: string;
};

/**
 * @description Plaintext token plus saved credential row (secret shown once).
 * @public
 */
export type CreateServiceAccountCredentialResult = {
  readonly credential: ServiceAccountCredential;
  readonly token: string;
};

/**
 * @description Outcome of `upsertCredentialForToken`. `action` distinguishes an idempotent
 * no-op (the token already verifies) from a write (a new credential row, or an in-place
 * rehash/un-revoke of an existing one).
 * @public
 */
export type UpsertServiceAccountCredentialResult = {
  readonly action: 'created' | 'noop' | 'updated';
  readonly credential: ServiceAccountCredential;
};

/**
 * @description Outcome of `upsertTelemetryIngestCredential`: the upsert plus the derived
 * plaintext token it provisioned.
 * @public
 */
export interface UpsertTelemetryIngestCredentialResult extends UpsertServiceAccountCredentialResult {
  readonly token: string;
}

/**
 * @description A {@link ServiceAccountCredentialsRepository} mock: every inherited
 * `BaseRepository` method plus the credential ones.
 * @public
 */
export interface ServiceAccountCredentialsRepositoryMock extends BaseRepositoryMock<
  ServiceAccountCredential,
  ServiceAccountCredentialCreateInput
> {
  readonly createCredential: Mock<
    ServiceAccountCredentialsRepository['createCredential']
  >;
  readonly findActiveCredentials: Mock<
    ServiceAccountCredentialsRepository['findActiveCredentials']
  >;
  readonly findCredentialById: Mock<
    ServiceAccountCredentialsRepository['findCredentialById']
  >;
  readonly findCredentials: Mock<
    ServiceAccountCredentialsRepository['findCredentials']
  >;
  readonly revokeCredential: Mock<
    ServiceAccountCredentialsRepository['revokeCredential']
  >;
  readonly touchLastUsedAt: Mock<
    ServiceAccountCredentialsRepository['touchLastUsedAt']
  >;
  readonly upsertCredentialForToken: Mock<
    ServiceAccountCredentialsRepository['upsertCredentialForToken']
  >;
  readonly upsertTelemetryIngestCredential: Mock<
    ServiceAccountCredentialsRepository['upsertTelemetryIngestCredential']
  >;
  readonly verifyBearerToken: Mock<
    ServiceAccountCredentialsRepository['verifyBearerToken']
  >;
}
