import { createMock } from '@golevelup/ts-vitest';
import { Global, Module } from '@nestjs/common';
import { LoggerService } from '@openthrottle/nestjs-modules';

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
