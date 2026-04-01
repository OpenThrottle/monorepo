import { describe, it, expect, beforeAll } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { POLICY_FACTORY } from '@openthrottle/nestjs-common';
import { <%= namePascal %>Resolver } from './<%= name %>.resolver';
import { <%= namePascal %>Service } from './<%= name %>.service';

describe('<%= namePascal %>Resolver', () => {
  let resolver: <%= namePascal %>Resolver;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [],
      exports: [],
      imports: [],
      providers: [
        <%= namePascal %>Resolver,
        {
          provide: <%= namePascal %>Service,
          useValue: {},
        },
        {
          provide: POLICY_FACTORY,
          useValue: {},
        },
      ],
    }).compile();

    resolver = module.get<<%= namePascal %>Resolver>(
      <%= namePascal %>Resolver,
    );
  });

  it('should be defined', () => {
    expect(resolver).toBeDefined();
  });
});
