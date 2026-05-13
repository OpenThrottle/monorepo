import { beforeEach, describe, expect, it } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { createMock } from '@golevelup/ts-vitest';
import { LoggerService } from '@openthrottle/nestjs-modules';
import { PlansService } from '@openthrottle/nestjs-repositories';
import { PlanCreationService } from './plan-creation.service';

describe('PlanCreationService', () => {
  let service: PlanCreationService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PlanCreationService,
        {
          provide: LoggerService,
          useValue: createMock<LoggerService>(),
        },
        {
          provide: PlansService,
          useValue: createMock<PlansService>(),
        },
      ],
    }).compile();

    service = module.get<PlanCreationService>(PlanCreationService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
