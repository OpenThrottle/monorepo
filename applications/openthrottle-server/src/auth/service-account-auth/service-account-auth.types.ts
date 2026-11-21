import type { ServiceAccountAuthPrincipal } from '@openthrottle/nestjs-auth';

/**
 * @description A verified service-account bearer: the principal it acts as, plus the
 * credential's scope allow-list (null when the credential is unrestricted).
 */
export interface ServiceAccountAuthentication {
  readonly principal: ServiceAccountAuthPrincipal;
  readonly scopes: readonly string[] | null;
}
