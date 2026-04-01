import { describe, it, expect, beforeAll } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { createMock } from '@golevelup/ts-vitest';
import { LoggerService } from '@openthrottle/nestjs-modules/src/logger/logger.service';
import { <%= namePascal %>Service } from './<%= name %>.service';

describe('<%= namePascal %>Service', () => {
  let service: <%= namePascal %>Service;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        <%= namePascal %>Service,
        {
          provide: LoggerService,
          useValue: createMock<LoggerService>(),
        },
      ],
    }).compile();

    service = module.get<<%= namePascal %>Service>(
      <%= namePascal %>Service,
    );
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
    expect(service.exampleMethod).toBeDefined();
  });
});
