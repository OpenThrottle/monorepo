/**
 * @description User-scoped resolution of a filesystem path to one of the caller's registered
 * checkouts. Read-only: it never registers, creates or mutates a checkout.
 */

import { Module } from '@nestjs/common';
import { LoggerModule } from '@openthrottle/nestjs-modules';
import { NestjsRepositoriesModule } from '@openthrottle/nestjs-repositories';
import { CheckoutPathResolutionService } from './checkout-path-resolution.service';

@Module({
  exports: [CheckoutPathResolutionService],
  imports: [LoggerModule, NestjsRepositoriesModule],
  providers: [CheckoutPathResolutionService],
})
export class CheckoutPathResolutionModule {}
