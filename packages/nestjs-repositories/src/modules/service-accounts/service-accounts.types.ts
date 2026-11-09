import type { ServiceAccountCredential } from './service-account-credential.entity.ts';
/** Result of a successful {@link ServiceAccountsService.verifyBearerToken}. */
export type VerifiedServiceAccountCredential = {
  readonly credentialId: string;
  readonly serviceAccountId: string;
};

/** Plaintext token plus saved credential row (secret shown once). */
export type CreateServiceAccountCredentialResult = {
  readonly credential: ServiceAccountCredential;
  readonly token: string;
};

/**
 * Outcome of {@link ServiceAccountsService.upsertCredentialForToken}. `action`
 * distinguishes an idempotent no-op (the token already verifies) from a write
 * (a new credential row, or an in-place rehash/un-revoke of an existing one).
 */
export type UpsertServiceAccountCredentialResult = {
  readonly action: 'created' | 'noop' | 'updated';
  readonly credential: ServiceAccountCredential;
};
