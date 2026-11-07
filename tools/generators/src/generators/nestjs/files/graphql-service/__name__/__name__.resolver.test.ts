/**
 * @description Unit tests for <%= namePascal %>Resolver. The permissions guard is
 * overridden so these tests exercise resolver wiring, not RBAC.
 */

import { Test } from '@nestjs/testing';
import { beforeEach, describe, expect, it } from 'vitest';

import { GqlPermissionsGuard } from '../../guards/gql-permissions.guard.ts';
import { <%= namePascal %>Resolver } from './<%= name %>.resolver.ts';
import { <%= namePascal %>Service } from './<%= name %>.service.ts';

describe('<%= namePascal %>Resolver', () => {
  let resolver: <%= namePascal %>Resolver;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        <%= namePascal %>Resolver,
        {
          provide: <%= namePascal %>Service,
          useValue: {
            findAll: () => Promise.resolve({ items: [], totalCount: 0 }),
            findById: () => Promise.resolve(null),
          },
        },
      ],
    })
      .overrideGuard(GqlPermissionsGuard)
      .useValue({ canActivate: () => true })
      .compile();

    resolver = moduleRef.get<<%= namePascal %>Resolver>(<%= namePascal %>Resolver);
  });

  it('should be defined', () => {
    expect(resolver).toBeDefined();
  });

  it('returns an empty list envelope from <%= pluralCamel %>', async () => {
    const result = await resolver.<%= pluralCamel %>();
    expect(result).toEqual({ items: [], totalCount: 0 });
  });
});
