# Plan 002: Remove commented-out dead code from the server bootstrap

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving on. If
> anything in "STOP conditions" occurs, stop and report — do not improvise.
> When done, update this plan's status row in `plans/README.md`.
>
> **Drift check (run first)**: `git diff --stat 9d10ccc6..HEAD -- applications/openthrottle-server/src/main.ts`
> If `main.ts` changed since this plan was written, compare the "Current state"
> excerpt against the live code before proceeding; on a mismatch, STOP.

## Status

- **Priority**: P2
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none
- **Category**: tech-debt
- **Planned at**: commit `9d10ccc6`, 2026-07-05

## Why this matters

`src/main.ts` carries ~40 lines of commented-out code: a `setHeadersMiddleware`, a `graphqlUploadExpress` block, a global `ValidationPipe`, and their explanatory comments. This is the app's bootstrap — the file editors touch when changing webhook/body-parser/guard wiring, all of which are load-bearing (see the active comments about `rawBody` and the custom JSON body parser). Dead commented blocks here invite the exact wrong move: someone "restores" the `ValidationPipe` or upload middleware without understanding it interacts with GraphQL and the Stripe webhook path. Deleting them removes the trap; git history preserves the ideas if ever needed.

## Current state

- `applications/openthrottle-server/src/main.ts` — the NestJS bootstrap. It has **active** logic that must remain (the `useBodyParser('json', { type: [...] })` block, `rawBody: true`, CORS, shutdown hooks, `uncaughtException`/`unhandledRejection` handlers). It also has these **commented-out** dead blocks to remove:

Around lines 92–111 (inside `bootstrap`):

```ts
// Global middleware to set response headers
// app.use(setHeadersMiddleware);

/** @external https://github.com/meabed/graphql-upload-ts */
// app.use(
//   graphqlUploadExpress({
//     maxFileSize: 10_000_000,
//     maxFiles: 10,
//   }),
// );

// 🚧 We only want this when we're using a REST API, not for GraphQL
// /** @external https://docs.nestjs.com/pipes#global-scoped-pipes */
// app.useGlobalPipes(
//   // Used to validate incoming requests
//   new ValidationPipe({
//     // Strip any properties that don't decorators (aren't correctly set)
//     whitelist: true,
//   }),
// );
```

And around lines 120–132 (after `bootstrap`, before the `process.on(...)` handlers):

```ts
// /**
//  * @description Middleware to set response headers
//  */
// const setHeadersMiddleware = (
//   _req: Request,
//   res: Response,
//   next: NextFunction,
// ) => {
//   res.headers.set('X-App-Name', process.env.APP_NAME!);
//   res.headers.set('X-App-Version', process.env.APP_VERSION!);
//
//   next();
// };
```

## Commands you will need

| Purpose               | Command                                                                                                             | Expected on success |
| --------------------- | ------------------------------------------------------------------------------------------------------------------- | ------------------- |
| Typecheck             | `pnpm nx run openthrottle-server:typecheck`                                                                         | exit 0              |
| Test                  | `pnpm nx run openthrottle-server:test`                                                                              | all pass            |
| Lint                  | `pnpm nx run openthrottle-server:lint`                                                                              | exit 0              |
| No leftover dead refs | `grep -n "setHeadersMiddleware\|graphqlUploadExpress\|useGlobalPipes" applications/openthrottle-server/src/main.ts` | no output (exit 1)  |

## Scope

**In scope** (only file to modify):

- `applications/openthrottle-server/src/main.ts`

**Out of scope** (do NOT touch, even though they are right next to the deletions):

- The active `useBodyParser('json', { type: ['application/csp-report', 'application/json', 'application/reports+json'] })` block and its comment — this is load-bearing; `application/json` MUST stay in the list or `/graphql` POST bodies 400.
- `rawBody: true`, `enableCors`, `enableShutdownHooks`, `useLogger`, the profiling reporter block, and the `process.on('uncaughtException'|'unhandledRejection')` handlers — all active, keep them.

## Git workflow

- Work on the single shared PR branch the operator assigns for these plans.
- Commit style: conventional commits, no attribution lines. Example: `refactor(openthrottle-server): remove commented-out dead bootstrap code`.
- Do NOT push or open a PR unless instructed.

## Steps

### Step 1: Delete the two commented-out blocks

Remove the two excerpts shown in "Current state" (the middleware/upload/validation-pipe block inside `bootstrap`, and the `setHeadersMiddleware` definition after it). Delete the surrounding now-orphaned comment lines too (e.g. `// Global middleware to set response headers`). Do not delete any line that is active (uncommented) code.

If removing these leaves an unused import (e.g. a `Request`/`Response`/`NextFunction` type import that only the commented code referenced), remove that import as well — typecheck/lint will confirm.

**Verify**: `grep -n "setHeadersMiddleware\|graphqlUploadExpress\|useGlobalPipes\|ValidationPipe" applications/openthrottle-server/src/main.ts` → no output

### Step 2: Typecheck, lint, test

**Verify**:

- `pnpm nx run openthrottle-server:typecheck` → exit 0
- `pnpm nx run openthrottle-server:lint` → exit 0
- `pnpm nx run openthrottle-server:test` → all pass

## Test plan

No new test — pure dead-code removal, no runtime behavior change. Existing suite passing is the guard.

## Done criteria

ALL must hold:

- [ ] `grep -n "setHeadersMiddleware\|graphqlUploadExpress\|useGlobalPipes\|ValidationPipe" applications/openthrottle-server/src/main.ts` → no output
- [ ] The active `useBodyParser('json'` block is still present (`grep -c "useBodyParser" applications/openthrottle-server/src/main.ts` prints `1`)
- [ ] `pnpm nx run openthrottle-server:typecheck` exits 0
- [ ] `pnpm nx run openthrottle-server:test` exits 0
- [ ] `pnpm nx run openthrottle-server:lint` exits 0
- [ ] `git status` shows only `main.ts` modified
- [ ] `plans/README.md` status row updated

## STOP conditions

Stop and report if:

- Any of the target blocks is NOT commented out (i.e. it is active code) — the file has drifted; report the current state.
- Deleting the blocks forces changes outside `main.ts` (other than removing a now-unused import inside `main.ts`).
- Typecheck/lint/test fails after deletion and the cause is not an obvious unused-import cleanup.

## Maintenance notes

- Reviewer: confirm only commented lines were removed and the active bootstrap (body parser, CORS, rawBody, error handlers) is untouched.
- If request-header stamping or file upload is genuinely wanted later, implement it fresh against current NestJS APIs rather than reviving these snippets.
