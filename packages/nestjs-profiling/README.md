# @openthrottle/nestjs-profiling

NestJS profiling utilities for measuring response time and capturing execution metadata (inputs, outputs, timings) for tuning and debugging. Supports decorators, a standalone util, and optional file output for AI consumption.

## Installation

Install with your preferred package manager:

**pnpm:**

```bash
pnpm add @openthrottle/nestjs-profiling
```

**npm:**

```bash
npm install @openthrottle/nestjs-profiling
```

**yarn:**

```bash
yarn add @openthrottle/nestjs-profiling
```

## Module registration

Import `NestjsProfilingModule` in your app module to use the profiling service and ensure logger context is available:

```ts
import { NestjsProfilingModule } from '@openthrottle/nestjs-profiling';

@Module({
  imports: [NestjsProfilingModule /* ... */],
})
export class AppModule {}
```

## @ProfileResponseTime

Measures and logs how long a method takes. Supports both sync and async methods. Optional label/tag is included in the log message.

```ts
import { ProfileResponseTime } from '@openthrottle/nestjs-profiling';

@Resolver()
export class MyResolver {
  @ProfileResponseTime('MyResolver.getItems')
  async getItems(): Promise<Item[]> {
    return this.service.find();
  }

  @ProfileResponseTime() // uses method name as tag
  async getOne(id: string): Promise<Item | null> {
    return this.service.findOne(id);
  }
}
```

## @ProfileExecution

Captures execution metadata (inputs, output, timings) in a structured format, similar to MongoDB `.explain()` on aggregations. Results are sent to the global reporter; use `setProfileExecutionReporter` to send them to a file or other sink.

```ts
import { ProfileExecution } from '@openthrottle/nestjs-profiling';

@Resolver()
export class MyResolver {
  @ProfileExecution('searchPlans')
  async searchPlans(query: string): Promise<Plan[]> {
    return this.searchService.run(query);
  }
}
```

## profileExecution (util)

Use when a decorator is not suitable (e.g. one-off blocks or non-method code). Runs a function and captures execution metadata.

```ts
import { profileExecution } from '@openthrottle/nestjs-profiling';

const { result, execution } = await profileExecution(
  'myLabel',
  async () => {
    return await doWork();
  },
  { inputs: [arg1], metadata: { custom: true } },
);
```

## File writer for AI consumption

To write profile/explain output to a file (NDJSON, one JSON object per line), set the reporter at bootstrap using `createProfileExecutionFileWriter` and `setProfileExecutionReporter`. Writes are asynchronous and fire-and-forget.

```ts
import {
  createProfileExecutionFileWriter,
  setProfileExecutionReporter,
} from '@openthrottle/nestjs-profiling';

// In main.ts or before any @ProfileExecution / profileExecution usage
if (process.env.PROFILE_EXECUTION_OUTPUT_PATH) {
  setProfileExecutionReporter(
    createProfileExecutionFileWriter({
      outputPath: process.env.PROFILE_EXECUTION_OUTPUT_PATH,
    }),
  );
}
```

The output file can be consumed by tooling or AI for tuning and debugging. Each line is a JSON object with `durationMs`, `label`, `methodName`, `inputs`, `output`, `startTime`, `endTime`, and optional `error` / `metadata`.
