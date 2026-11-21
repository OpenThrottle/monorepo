import { SetMetadata } from '@nestjs/common';
import type { ServiceAccountCredentialScope } from '@openthrottle/nestjs-repositories-server';

import { CREDENTIAL_SCOPES_KEY } from './guards.constants.ts';

/**
 * @description Declares which credential scopes may call a handler. A service-account
 * credential with a non-null `scopes` allow-list is refused (403) by the global auth guard on
 * every handler that does not declare one of its scopes; an unrestricted credential and a human
 * JWT are unaffected. This narrows a credential and grants nothing: the handler's own
 * `@Permissions()` and authz stance still apply.
 *
 * @example
 * ```ts
 * @CredentialScope(SERVICE_ACCOUNT_CREDENTIAL_SCOPES.TELEMETRY_INGEST)
 * @Mutation(() => SkillUsageEventObject)
 * async recordSkillUsage(...) { ... }
 * ```
 */
export const CredentialScope = (
  ...scopes: ServiceAccountCredentialScope[]
): MethodDecorator & ClassDecorator => {
  return SetMetadata(CREDENTIAL_SCOPES_KEY, scopes);
};
