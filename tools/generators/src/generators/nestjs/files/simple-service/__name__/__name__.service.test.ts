/**
 * @description Unit tests for <%= namePascal %>Service.
 */

import { createMock } from '@golevelup/ts-vitest';
import { Test } from '@nestjs/testing';
import { LoggerService } from '@openthrottle/nestjs-modules';
import { beforeEach, describe, expect, it } from 'vitest';

import { <%= namePascal %>Service } from './<%= name %>.service.ts';

describe('<%= namePascal %>Service', () => {
  let service: <%= namePascal %>Service;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        <%= namePascal %>Service,
        {
          provide: LoggerService,
          useValue: createMock<LoggerService>(),
        },
      ],
    }).compile();

    service = moduleRef.get<<%= namePascal %>Service>(<%= namePascal %>Service);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
    expect(service.exampleMethod).toBeDefined();
  });
});
