/**
 * @description Translates a checkout reference into the directory an agent CLI runs in, for every
 * launcher: scheduled agent jobs, plan enqueue and chat turns.
 */

import { Module } from '@nestjs/common';
import { LoggerModule } from '@openthrottle/nestjs-modules';
import { RepositoryCheckoutsModule } from '@openthrottle/nestjs-repositories-server';

import { CheckoutPathService } from './checkout-path.service.ts';

@Module({
  exports: [CheckoutPathService],
  imports: [LoggerModule, RepositoryCheckoutsModule],
  providers: [CheckoutPathService],
})
export class CheckoutPathModule {}
