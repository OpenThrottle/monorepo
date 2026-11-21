/**
 * @description Application service for <%= name %>. Wire repositories or other
 * collaborators as the feature grows; keep GraphQL mapping in the resolver.
 */

import { Injectable } from '@nestjs/common';
import type { PaginationInput } from '@openthrottle/nestjs-postgres';

import type {
  <%= singularPascal %>ListResult,
  <%= singularPascal %>Object,
} from './<%= name %>.object.ts';

@Injectable()
export class <%= namePascal %>Service {
  /**
   * @description One page of <%= plural %>. Page a query builder with `paginate(qb, pagination)`
   * from `@openthrottle/nestjs-postgres` and map `hasNextPage(page, skip)`.
   */
  findAll(pagination: PaginationInput): Promise<<%= singularPascal %>ListResult> {
    void pagination;
    return Promise.resolve({
      hasNextPage: false,
      items: [],
      totalCount: 0,
    });
  }

  findById(id: string): Promise<<%= singularPascal %>Object | null> {
    void id;
    return Promise.resolve(null);
  }
}
