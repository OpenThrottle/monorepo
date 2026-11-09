/**
 * @description GraphQL feature module for <%= name %>. Register this module in
 * `app.module.ts` after scaffolding. NestjsRepositoriesModule supplies RolesService
 * for GqlPermissionsGuard.
 */

import { Module } from '@nestjs/common';
import { NestjsRepositoriesModule } from '@openthrottle/nestjs-repositories';

import { GqlPermissionsGuard } from '../../guards/gql-permissions.guard.ts';
import { <%= namePascal %>Resolver } from './<%= name %>.resolver.ts';
import { <%= namePascal %>Service } from './<%= name %>.service.ts';

@Module({
  exports: [<%= namePascal %>Service],
  imports: [NestjsRepositoriesModule],
  providers: [
    GqlPermissionsGuard,
    <%= namePascal %>Resolver,
    <%= namePascal %>Service,
  ],
})
export class <%= namePascal %>GraphqlModule {}
