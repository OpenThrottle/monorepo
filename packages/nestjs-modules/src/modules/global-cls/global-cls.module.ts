import { Module } from '@nestjs/common';
import { ClsModule, ClsService } from 'nestjs-cls';

import { GlobalClsService } from './global-cls.service.ts';
import type { GlobalClsStore } from './global-cls.types.ts';
import type { GlobalClsUser } from './global-cls.types.ts';
import { setupGlobalCls } from './global-cls.utils.ts';
import { applyGlobalClsUser } from './global-cls.utils.ts';

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
