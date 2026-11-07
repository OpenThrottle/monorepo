/**
 * @description Unit tests for <%= namePascal %>Service.
 */

import { Test } from '@nestjs/testing';
import { beforeEach, describe, expect, it } from 'vitest';

import { <%= namePascal %>Service } from './<%= name %>.service.ts';

describe('<%= namePascal %>Service', () => {
  let service: <%= namePascal %>Service;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [<%= namePascal %>Service],
    }).compile();

    service = moduleRef.get<<%= namePascal %>Service>(<%= namePascal %>Service);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('findAll returns an empty list envelope', async () => {
    await expect(service.findAll()).resolves.toEqual({
      items: [],
      totalCount: 0,
    });
  });

  it('findById returns null until wired to a repository', async () => {
    await expect(service.findById('example-id')).resolves.toBeNull();
  });
});
