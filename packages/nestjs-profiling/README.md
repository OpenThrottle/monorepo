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

## Module registration

The decorators and the `profileExecution` util work standalone — they do **not** require a
module import. `NestjsProfilingModule` is an optional convenience that wires the shared
`LoggerModule` so the profiling logger context is available; it exposes no providers of its
own. Import it only if you want that logger context registered in your app:

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

Captures execution metadata (timings, and optionally inputs/output) in a structured format, similar to MongoDB `.explain()` on aggregations. Results are sent to the global reporter; use `setProfileExecutionReporter` to send them to a file or other sink.

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

### Capturing inputs/output (opt-in, dev only)

> **Security:** Capturing inputs/output can leak PII and secrets (passwords, tokens,
> emails, full row payloads) into profiling output. Both are **OFF by default**. Enable
> them only for local/dev tuning and **never** against PII-bearing resolvers/services in
> production.

Pass an options object to opt in. Captured values are redacted before they leave the
process — keys matching a denylist (`password`, `token`, `secret`, `authorization`,
`email`, `cookie`, `apikey`, `credential`, `jwt`, `phone`, `ssn`) are replaced with
`[REDACTED]`, nesting depth is capped, long strings are truncated, and class instances
are not serialized verbatim.

```ts
@ProfileExecution({
  captureInputs: true, // default false
  captureOutput: true, // default false
  label: 'searchPlans',
})
async searchPlans(query: string): Promise<Plan[]> {
  return this.searchService.run(query);
}
```

Customize redaction with your own redactor (e.g. a stricter denylist or smaller caps):

```ts
import {
  createProfileExecutionRedactor,
  ProfileExecution,
} from '@openthrottle/nestjs-profiling';

const redactor = createProfileExecutionRedactor({
  denylist: ['password', 'token', 'address'],
  maxDepth: 4,
  maxStringLength: 512,
});

@ProfileExecution({ captureInputs: true, captureOutput: true, redactor })
async updateUser(input: UpdateUserInput): Promise<User> {
  /* ... */
}
```

## profileExecution (util)

Use when a decorator is not suitable (e.g. one-off blocks or non-method code). Runs a function and captures execution metadata.

Inputs/output capture is OFF by default here too; enable per call with
`captureInputs`/`captureOutput`.

```ts
import { profileExecution } from '@openthrottle/nestjs-profiling';

const { result, execution } = await profileExecution(
  'myLabel',
  async () => {
    return await doWork();
  },
  {
    captureInputs: true, // default false — redacted when enabled
    captureOutput: true, // default false — redacted when enabled
    inputs: [arg1],
    metadata: { custom: true },
  },
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

The output file can be consumed by tooling or AI for tuning and debugging. Each line is a JSON object with `durationMs`, `label`, `methodName`, `startTime`, `endTime`, and optional `error` / `metadata`. `inputs` and `output` appear only when the producing decorator/util opted in to capture (default OFF) and are redacted at the source; the writer additionally caps line size (`maxLineBytes`, default 64KB) as defense-in-depth.

> **Production note:** Setting `PROFILE_EXECUTION_OUTPUT_PATH` only routes timings to disk. It does **not** turn on inputs/output capture — that requires explicit `captureInputs`/`captureOutput` flags at each call site, which must never be enabled against PII-bearing resolvers in production.
