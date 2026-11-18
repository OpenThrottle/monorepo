import { createBaseRepositoryMock } from '@openthrottle/nestjs-postgres/testing';
import { vi } from 'vitest';

import type { ServiceAccountCredential } from './service-account-credential.entity.ts';
import type {
  ServiceAccountCredentialCreateInput,
  ServiceAccountCredentialsRepositoryMock,
} from './service-account-credentials.types.ts';

/**
 * @description Builds a {@link ServiceAccountCredentialsRepositoryMock} that starts as an
 * empty `service_account_credentials` table (see `createBaseRepositoryMock`): no credentials,
 * every token fails to verify, and `createCredential` / `upsertCredentialForToken` answer
 * null like a missing service account. Provide it in place of
 * `ServiceAccountCredentialsRepository` and stub per test. Test-only: imports `vitest`.
 * @public
 */
export function createServiceAccountCredentialsRepositoryMock(): ServiceAccountCredentialsRepositoryMock {
  return {
    ...createBaseRepositoryMock<
      ServiceAccountCredential,
      ServiceAccountCredentialCreateInput
    >('service_account_credentials'),
    createCredential: vi.fn(async () => {
      return null;
    }),
    findActiveCredentials: vi.fn(async () => {
      return [];
    }),
    findCredentialById: vi.fn(async () => {
      return null;
    }),
    findCredentials: vi.fn(async () => {
      return [];
    }),
    revokeCredential: vi.fn(async () => {
      return false;
    }),
    touchLastUsedAt: vi.fn(async () => {
      return false;
    }),
    upsertCredentialForToken: vi.fn(async () => {
      return null;
    }),
    verifyBearerToken: vi.fn(async () => {
      return null;
    }),
  };
}
