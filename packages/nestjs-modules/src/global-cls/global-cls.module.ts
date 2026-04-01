import { Module } from '@nestjs/common';
import { ClsModule, ClsService } from 'nestjs-cls';
import {
  HEADER_APP_NAME,
  HEADER_APP_VERSION,
} from '@openthrottle/nestjs-utils/src/config/index';
import type { GlobalClsUser } from './global-cls-user';
import {
  applyGlobalClsUser,
  GlobalClsService,
  type GlobalClsStore,
} from './global-cls.service';

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
        setup: (cls, req) => {
          const headerAppName = req.headers[HEADER_APP_NAME];
          const headerAppVersion = req.headers[HEADER_APP_VERSION];

          // FIXME: Looks back into this
          // console.log('🔒 GlobalCLS', { headerAppName, headerAppVersion });

          cls.set('app', {
            name: headerAppName || 'x-app-name - unknown',
            version: headerAppVersion || 'x-app-version - unknown',
          });
        },
      },
    }),
  ],
  providers: [
    {
      inject: [ClsService],
      provide: GlobalClsService,
      useFactory: (cls: ClsService<GlobalClsStore>) => {
        const augmented = Object.assign(cls, {
          setUser(user: GlobalClsUser) {
            applyGlobalClsUser(cls, user);
          },
        });
        // nestjs-cls exposes one ClsService singleton; attach setUser without replacing the instance.
        // eslint-disable-next-line @typescript-eslint/consistent-type-assertions -- structural GlobalClsService for DI
        return augmented as GlobalClsService;
      },
    },
  ],
})
export class GlobalClsModule {}
