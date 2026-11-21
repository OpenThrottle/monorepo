/**
 * @description Registers the OAuth authorization server REST routes (OT plan 16f321a7).
 */

import { Module } from '@nestjs/common';
import { LoggerModule } from '@openthrottle/nestjs-modules';
import { OAuthModule } from '@openthrottle/nestjs-repositories-server';

import { ClientMetadataService } from './client-metadata/client-metadata.service.ts';
import { OAuthController } from './oauth.controller.ts';

@Module({
  controllers: [OAuthController],
  imports: [LoggerModule, OAuthModule],
  providers: [ClientMetadataService],
})
export class OAuthRoutesModule {}
