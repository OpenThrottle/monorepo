import {
  HEADER_APP_NAME,
  HEADER_APP_VERSION,
} from '@openthrottle/nestjs-utils';
import type { ClsService } from 'nestjs-cls';

import { UNKNOWN_APP_NAME } from './global-cls.constants.ts';
import type {
  GlobalClsJwtLikeInput,
  GlobalClsUser,
} from './global-cls.types.ts';
import type { GlobalClsStore } from './global-cls.types.ts';
/**
 * @description Maps JWT-like payload to {@link GlobalClsUser} with safe defaults when fields are absent.
 * Use for minimal coupling; replace or enrich in the app after loading the full user record if needed.
 */
export const globalClsUserFromJwtLike = (
  input: GlobalClsJwtLikeInput,
): GlobalClsUser => {
  const email = input.email ?? '';
  const uuid = input.sub;

  return {
    displayName: email.length > 0 ? email : uuid,
    email,
    isDeleted: false,
    permissions: undefined,
    roles: input.roles != null ? [...input.roles] : [],
    uuid,
  };
};
/**
 * @description CLS middleware setup hook: reads the `x-app-name` /
 * `x-app-version` request headers and seeds the `app` context. Empty-string or
 * missing headers fall back to a sentinel so downstream consumers always read a
 * non-empty value. Extracted from the {@link ClsModule.forRoot} config so it can
 * be unit-tested directly.
 */
/**
 * Request header carrying an active work-ledger session id for ambient attribution. The value is
 * client-supplied, so it is trusted only when the session exists and its actor matches the
 * authenticated request principal; on a mismatch or unknown id the server ignores it and opens an
 * instant session instead — it never errors. That rule is G11 in
 * docs/monorepo/work-ledger-sessions.md.
 */
const HEADER_OT_SESSION_ID = 'x-ot-session-id';

export const setupGlobalCls = (
  cls: ClsService,
  req: { headers: Record<string, string | undefined> },
): void => {
  const headerAppName = req.headers[HEADER_APP_NAME];
  const headerAppVersion = req.headers[HEADER_APP_VERSION];

  const app: GlobalClsStore['app'] = {
    name: headerAppName || UNKNOWN_APP_NAME,
    version: headerAppVersion || 'x-app-version - unknown',
  };

  cls.set('app', app);

  // Unvalidated claim — the work-ledger capture path verifies the session's actor
  // against the request principal before trusting it (see HEADER_OT_SESSION_ID above).
  const headerSessionId = req.headers[HEADER_OT_SESSION_ID];
  cls.set(
    'sessionId',
    headerSessionId != null && headerSessionId !== ''
      ? headerSessionId
      : undefined,
  );
};
/**
 * @description Writes {@link GlobalClsUser} into the CLS store. Use this when you hold a raw {@link ClsService} reference.
 */
export const applyGlobalClsUser = (
  cls: ClsService<GlobalClsStore>,
  user: GlobalClsUser,
): void => {
  cls.set('user', {
    displayName: user.displayName,
    email: user.email,
    isDeleted: user.isDeleted,
    permissions: user.permissions != null ? [...user.permissions] : undefined,
    roles: [...user.roles],
    uuid: user.uuid,
  });
};
