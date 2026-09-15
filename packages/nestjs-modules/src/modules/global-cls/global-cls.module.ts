import { Module } from '@nestjs/common';
import {
  HEADER_APP_NAME,
  HEADER_APP_VERSION,
} from '@openthrottle/nestjs-utils';
import { ClsModule, ClsService } from 'nestjs-cls';

import {
  applyGlobalClsUser,
  GlobalClsService,
  type GlobalClsStore,
} from './global-cls.service.ts';
import type { GlobalClsUser } from './global-cls-user.ts';

/**
 * @description CLS middleware setup hook: reads the `x-app-name` /
 * `x-app-version` request headers and seeds the `app` context. Empty-string or
 * missing headers fall back to a sentinel so downstream consumers always read a
 * non-empty value. Extracted from the {@link ClsModule.forRoot} config so it can
 * be unit-tested directly.
 */
/** Request header carrying an active work-ledger session id for ambient attribution (G11). */
const HEADER_OT_SESSION_ID = 'x-ot-session-id';

/**
 * @description Sentinel seeded into `app.name` when the caller sent no usable `x-app-name`.
 * Exported so consumers that attribute work to a client can recognise "we do not know who
 * this was" rather than treating the sentinel as a real client name.
 * @public
 */
export const UNKNOWN_APP_NAME = 'x-app-name - unknown';

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
  // against the request principal before trusting it (G11).
  const headerSessionId = req.headers[HEADER_OT_SESSION_ID];
  cls.set(
    'sessionId',
    headerSessionId != null && headerSessionId !== ''
      ? headerSessionId
      : undefined,
  );
};

/**
 * @external https://papooch.github.io/nestjs-cls
 * @description Continuation-local storage allows to store state and propagate
 * it throughout callbacks and promise chains. It allows storing data throughout
 * the lifetime of a web request or any other asynchronous duration. It is
 * similar to thread-local storage in other languages.
 */
@Module({
  exports: [GlobalClsService],
  imports: [
    ClsModule.forRoot({
      global: true,
      middleware: {
        mount: true,
        setup: setupGlobalCls,
      },
    }),
  ],
  providers: [
    {
      inject: [ClsService],
      provide: GlobalClsService,
      useFactory: (cls: ClsService<GlobalClsStore>): GlobalClsService => {
        // nestjs-cls exposes one ClsService singleton; attach setUser without replacing the instance.
        const augmented: GlobalClsService = Object.assign(cls, {
          setUser(user: GlobalClsUser) {
            applyGlobalClsUser(cls, user);
          },
        });

        return augmented;
      },
    },
  ],
})
export class GlobalClsModule {}
