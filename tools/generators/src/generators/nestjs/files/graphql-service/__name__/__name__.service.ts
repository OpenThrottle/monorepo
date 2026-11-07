/**
 * @description Application service for <%= name %>. Wire repositories or other
 * collaborators as the feature grows; keep GraphQL mapping in the resolver.
 */

import { Injectable } from '@nestjs/common';

import type {
  <%= singularPascal %>ListResult,
  <%= singularPascal %>Object,
} from './<%= name %>.object.ts';

@Injectable()
export class <%= namePascal %>Service {
  findAll(): Promise<<%= singularPascal %>ListResult> {
    return Promise.resolve({
      items: [],
      totalCount: 0,
    });
  }

  findById(id: string): Promise<<%= singularPascal %>Object | null> {
    void id;
    return Promise.resolve(null);
  }
}
