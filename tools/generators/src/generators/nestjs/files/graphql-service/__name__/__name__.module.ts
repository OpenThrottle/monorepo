/**
 * @description GraphQL feature module for <%= name %>. Register this module in
 * `app.module.ts` after scaffolding. RolesModule supplies RolesRepository
 * for GqlPermissionsGuard.
 */

import { Module } from '@nestjs/common';
import { RolesModule } from '@openthrottle/nestjs-repositories-server';

import { GqlPermissionsGuard } from '../../guards/gql-permissions.guard.ts';
import { <%= namePascal %>Resolver } from './<%= name %>.resolver.ts';
import { <%= namePascal %>Service } from './<%= name %>.service.ts';

@Module({
  exports: [<%= namePascal %>Service],
  imports: [RolesModule],
  providers: [
    GqlPermissionsGuard,
    <%= namePascal %>Resolver,
    <%= namePascal %>Service,
  ],
})
export class <%= namePascal %>GraphqlModule {}
