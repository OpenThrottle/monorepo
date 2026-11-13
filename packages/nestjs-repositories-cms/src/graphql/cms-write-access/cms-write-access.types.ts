import type { AuthPrincipal } from '@openthrottle/nestjs-auth';

/**
 * @description An OpenThrottle user allowed to write cms content: what a profile is built from.
 * @public
 */
export interface CmsUserWriter {
  /** The user's email; null when the user row has none. */
  readonly email: string | null;
  readonly kind: 'user';
  /** `users.id` in the openthrottle database. */
  readonly userId: string;
}

/**
 * @description A service account allowed to write cms content. Service accounts have no profile.
 * @public
 */
export interface CmsServiceAccountWriter {
  readonly kind: 'service-account';
  readonly serviceAccountId: string;
}

/**
 * @description Who is writing, once authorized.
 * @public
 */
export type CmsWriter = CmsServiceAccountWriter | CmsUserWriter;

/**
 * @description The host's answer to "may this principal write cms content?".
 * @public
 */
export type CmsWriteDecision =
  | { readonly ok: false; readonly reason: string }
  | { readonly ok: true; readonly writer: CmsWriter };

/**
 * @description What the host app provides under `CMS_WRITE_AUTHORIZER`: its own, database-backed
 * permission check (openthrottle-server checks `cms:write` through its roles tables). The cms
 * package cannot check permissions itself; JWT-claim roles are not a safe source.
 * @public
 */
export interface CmsWriteAuthorizer {
  authorize(principal: AuthPrincipal): Promise<CmsWriteDecision>;
}
