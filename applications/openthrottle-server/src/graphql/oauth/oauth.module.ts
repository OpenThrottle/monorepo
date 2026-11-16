/**
 * @description Registers the OAuth consent and connected-clients GraphQL operations.
 */

import './oauth.object.ts';
import './oauth.input.ts';

import { Module } from '@nestjs/common';
import { NestjsRepositoriesModule } from '@openthrottle/nestjs-repositories-server';

import { OAuthResolver } from './oauth.resolver.ts';

@Module({
  imports: [NestjsRepositoriesModule],
  providers: [OAuthResolver],
})
export class OAuthGraphqlModule {}
