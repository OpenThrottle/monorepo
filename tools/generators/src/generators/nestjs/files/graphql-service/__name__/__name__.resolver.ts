import { Args, ObjectType, Query, Resolver } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { subject } from '@casl/ability';
import { CacheControl } from 'nestjs-gql-cache-control';
import { PaginatedResult, Result } from '@openthrottle/nestjs-core/src/entities/result.entity';
import { AppAbility } from '@openthrottle/nestjs-core/src/policies/types';
import { PoliciesGuard } from '@openthrottle/nestjs-core/src/policies/policies.guard';
import { CheckPolicies } from '@openthrottle/nestjs-core/src/policies/policies.decorator';
import { <%= namePascal %>Service } from './<%= name %>.service';
import { <%= singularPascal %> } from '~/services/<%= name %>/entities/<%= singular %>.entity';
import { <%= namePascal %>Policy } from '~/services/<%= name %>/<%= name %>.policy';
import { Get<%= namePascal %>Args } from '~/services/<%= name %>/dto/get-<%= name %>.args';

@ObjectType()
class <%= singularPascal %>Result extends Result(<%= singularPascal %>) {}

@ObjectType()
export class <%= singularPascal %>PaginatedResult extends PaginatedResult(
  <%= singularPascal %>,
) {}

@UseGuards(PoliciesGuard)
@Resolver()
export class <%= namePascal %>Resolver {
  constructor(
    private readonly <%= nameCamel %>Service: <%= namePascal %>Service,
  ) {}

  // @CacheControl({ maxAge: 60, scope: 'PRIVATE' })
  @CheckPolicies((ability: AppAbility) =>
    ability.can('read', subject(<%= namePascal %>Policy.resourceName, {})),
  )
  @Query(() => <%= singularPascal %>Result, {
    description: 'Get "role" by UUID',
  })
  get<%= namePascal %>(@Args() args: Get<%= namePascal %>Args) {
    return this.<%= nameCamel %>Service.getRoleById(args.uuid);
  }
}
