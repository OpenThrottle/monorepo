import { Module } from '@nestjs/common';
import { ClsModule, ClsService } from 'nestjs-cls';
import {
  HEADER_APP_NAME,
  HEADER_APP_VERSION,
} from '@openthrottle/nestjs-utils';
import type { GlobalClsUser } from './global-cls-user';
import {
  applyGlobalClsUser,
  GlobalClsService,
  type GlobalClsStore,
} from './global-cls.service';

/**
 * @description CLS middleware setup hook: reads the `x-app-name` /
 * `x-app-version` request headers and seeds the `app` context. Empty-string or
 * missing headers fall back to a sentinel so downstream consumers always read a
 * non-empty value. Extracted from the {@link ClsModule.forRoot} config so it can
 * be unit-tested directly.
 */
export const setupGlobalCls = (
  cls: ClsService,
  req: { headers: Record<string, string | undefined> },
): void => {
  const headerAppName = req.headers[HEADER_APP_NAME];
  const headerAppVersion = req.headers[HEADER_APP_VERSION];

  const app: GlobalClsStore['app'] = {
    name: headerAppName || 'x-app-name - unknown',
    version: headerAppVersion || 'x-app-version - unknown',
  };

  cls.set('app', app);
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
