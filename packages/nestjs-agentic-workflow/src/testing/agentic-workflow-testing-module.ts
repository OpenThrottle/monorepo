import { Global, Module, type ModuleMetadata } from '@nestjs/common';
import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { createMock } from '@golevelup/ts-vitest';
import { LoggerService } from '@openthrottle/nestjs-modules/src/logger/logger.service';

/**
 * @description Global stub for `LoggerService` so nested dynamic modules resolve logging when using
 * `Test.createTestingModule` (Vitest/Jest). Matches the need from `NestjsAgenticWorkflowModule`
 * imports that pull in `LoggerModule`-backed providers.
 */
@Global()
@Module({
  exports: [LoggerService],
  providers: [
    {
      provide: LoggerService,
      useValue: createMock<LoggerService>(),
    },
  ],
})
export class GlobalLoggerStubModule {}

/**
 * @description Builds a testing module with {@link GlobalLoggerStubModule} first, then your
 * `imports` (for example `NestjsAgenticWorkflowModule.register(...)`). Use when unit-testing
 * services or BullMQ processors that depend on worker GraphQL tokens from this package.
 */
export const compileAgenticWorkflowTestingModule = async (
  imports: NonNullable<ModuleMetadata['imports']>,
): Promise<TestingModule> =>
  Test.createTestingModule({
    imports: [GlobalLoggerStubModule, ...(imports ?? [])],
  }).compile();
