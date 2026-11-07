/**
 * @description GraphQL resolver for <%= name %>.
 */

import { UseGuards } from '@nestjs/common';
import { Args, Query, Resolver } from '@nestjs/graphql';
import { PERMISSIONS, Permissions } from '@openthrottle/nestjs-rbac';

import { GqlPermissionsGuard } from '../../guards/gql-permissions.guard.ts';
import { Get<%= singularPascal %>Input } from './<%= name %>.input.ts';
import {
  <%= singularPascal %>ListResult,
  <%= singularPascal %>Object,
} from './<%= name %>.object.ts';
import { <%= namePascal %>Service } from './<%= name %>.service.ts';

@Resolver(() => <%= singularPascal %>Object)
@UseGuards(GqlPermissionsGuard)
export class <%= namePascal %>Resolver {
  constructor(
    private readonly <%= nameCamel %>Service: <%= namePascal %>Service,
  ) {}

  @Query(() => <%= singularPascal %>ListResult, {
    description: `List <%= plural %>`,
  })
  // TODO: Replace SETTINGS_READ with the permission this feature actually needs.
  @Permissions(PERMISSIONS.SETTINGS_READ)
  <%= pluralCamel %>(): Promise<<%= singularPascal %>ListResult> {
    return this.<%= nameCamel %>Service.findAll();
  }

  @Query(() => <%= singularPascal %>Object, {
    description: `Get a <%= singular %> by id`,
    nullable: true,
  })
  // TODO: Replace SETTINGS_READ with the permission this feature actually needs.
  @Permissions(PERMISSIONS.SETTINGS_READ)
  <%= singularCamel %>(
    @Args('input', { type: () => Get<%= singularPascal %>Input })
    input: Get<%= singularPascal %>Input,
  ): Promise<<%= singularPascal %>Object | null> {
    return this.<%= nameCamel %>Service.findById(input.id);
  }
}
