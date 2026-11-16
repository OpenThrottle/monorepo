/**
 * @description NestJS module for the OAuth authorization server's entities and lifecycle.
 */

import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LoggerModule } from '@openthrottle/nestjs-modules';

import { OAuthService } from './oauth.service.ts';
import { OAuthAuthorizationRequest } from './oauth-authorization-request.entity.ts';
import { OAuthClient } from './oauth-client.entity.ts';
import { OAuthGrant } from './oauth-grant.entity.ts';
import { OAuthToken } from './oauth-token.entity.ts';

@Module({
  controllers: [],
  exports: [OAuthService, TypeOrmModule],
  imports: [
    LoggerModule,
    TypeOrmModule.forFeature([
      OAuthAuthorizationRequest,
      OAuthClient,
      OAuthGrant,
      OAuthToken,
    ]),
  ],
  providers: [OAuthService],
})
export class OAuthModule {}
