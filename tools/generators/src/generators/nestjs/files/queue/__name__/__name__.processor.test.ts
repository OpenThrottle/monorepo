import { describe, it, expect, beforeAll } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { LoggerService } from '@openthrottle/nestjs-modules';
import { Job } from 'bullmq';
import { <%= namePascal %>Processor } from './<%= name %>.processor';
import { <%= namePascal %>Data } from './<%= name %>.types';

// import { faker } from '@faker-js/faker';
// import { Processor } from '@nestjs/bullmq';

describe('<%= namePascal %>Processor', () => {
  let mockJob: Job<<%= namePascal %>Data>;
  let processor: <%= namePascal %>Processor;

  beforeEach(async () => {
    mockJob = {
      data: {},
    } as Job<<%= namePascal %>Data>;

    const module: TestingModule = await Test.createTestingModule({
      controllers: [],
      exports: [],
      imports: [],
      providers: [
        <%= namePascal %>Processor,
        {
          provide: LoggerService,
          useValue: {},
        },
      ],
    }).compile();

    processor = module.get(<%= namePascal %>Processor);
  });

  it('should be defined', () => {
    expect(mockJob).toBeDefined();
    expect(processor).toBeDefined();
  });

  // describe('TODO: add your specs', () => {
  //   it('TODO: add your specs', async () => {
  //     expect(true).toBe(true);
  //   });
  // });
});
