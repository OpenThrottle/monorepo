import type { SERVICE_ACCOUNT_CREDENTIAL_SCOPES } from './scope.constants.ts';

/**
 * @description One value of {@link SERVICE_ACCOUNT_CREDENTIAL_SCOPES}.
 * @public
 */
export type ServiceAccountCredentialScope =
  (typeof SERVICE_ACCOUNT_CREDENTIAL_SCOPES)[keyof typeof SERVICE_ACCOUNT_CREDENTIAL_SCOPES];
