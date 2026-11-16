/**
 * @description Registers the OAuth authorization server REST routes (OT plan 16f321a7).
 */

import { Module } from '@nestjs/common';
import { LoggerModule } from '@openthrottle/nestjs-modules';
import { NestjsRepositoriesModule } from '@openthrottle/nestjs-repositories';

import { ClientMetadataService } from './client-metadata/client-metadata.service.ts';
import { OAuthController } from './oauth.controller.ts';

@Module({
  controllers: [OAuthController],
  imports: [LoggerModule, NestjsRepositoriesModule],
  providers: [ClientMetadataService],
})
export class OAuthRoutesModule {}
