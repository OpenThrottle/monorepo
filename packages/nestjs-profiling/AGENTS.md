# @openthrottle/nestjs-profiling — agent notes

Profiling utilities for NestJS: `@ProfileResponseTime` and `@ProfileExecution` decorators, a
standalone `profileExecution` util, an NDJSON file writer, and key-name-based redaction.

**Consumed by:** `openthrottle-server` only (`main.ts`, `app.module.ts`, plans resolver).

## Layout

- `src/decorators/` — the whole package lives here: decorators, util, types, the reporter
  singleton, `profile-execution-file-writer.ts`, `profile-execution.redaction.ts`.
- `src/modules/nestjs-profiling.module.ts` — optional convenience module: only imports
  `LoggerModule`, exposes no providers. Decorators and util work without it.

## Invariants & gotchas

- Built, not source-first: real `build`/`dev` targets (`@nx/js:tsc`), top-level `exports` →
  `dist` (family pattern — see [../AGENTS.md](../AGENTS.md)).
- `@ProfileExecution` results go to a module-global reporter singleton
  (`setProfileExecutionReporter`); with no reporter set, results are silently dropped —
  wire the file writer (or another sink) at bootstrap if you expect output.
- File-writer defaults: flush per result (`maxBufferedLines: 1`), sample rate 1, 64 KiB
  line cap; lower the sample rate on hot paths. Write failures are throttled to one warning
  per 5 s.
- Redaction is case-insensitive key-name substring matching (`DEFAULT_REDACTION_DENYLIST`:
  password, token, email, …) applied before profiling output reaches any sink — don't
  bypass it when adding sinks.
- Imports `@openthrottle/nestjs-modules` (LoggerModule/logger types) even though
  `dependencies` in `package.json` is empty — resolution currently relies on workspace
  hoisting.

## Pointers

- [README.md](./README.md) — decorator options, file-writer usage, redaction configuration.
