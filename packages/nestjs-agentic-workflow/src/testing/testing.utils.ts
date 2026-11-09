import { type ModuleMetadata } from '@nestjs/common';
import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';

import { GlobalLoggerStubModule } from './testing.module.ts';
/**
 * @description Builds a testing module with {@link GlobalLoggerStubModule} first, then your
 * `imports` (for example `NestjsAgenticWorkflowModule.register(...)`). Use when unit-testing
 * services or BullMQ processors that depend on worker GraphQL tokens from this package.
 */
export const compileAgenticWorkflowTestingModule = async (
  imports: NonNullable<ModuleMetadata['imports']>,
): Promise<TestingModule> => {
  return Test.createTestingModule({
    imports: [GlobalLoggerStubModule, ...(imports ?? [])],
  }).compile();
};
