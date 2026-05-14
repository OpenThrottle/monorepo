# Test scope and acceptance criteria

**Plan:** `7997e3d2-6436-46f6-bff9-a966af06bec9` (Test plan)

## Scope

- **`DailyStatsProcessor.process`:** Behavior when `aggregateDailyStats`, `dailyStatsService.upsertForDate`, logging, or notifications throw (try/catch path: error log + `emitQueueJobCompleted` with `severity: 'error'`).
- **`KeyedJsonlRunRecord`:** Interface field order only; no runtime behavior change—typecheck/build coverage is sufficient unless consumers relied on key ordering (they should not).

## Acceptance criteria (definition of done)

1. **`pnpm nx run openthrottle-server:test`** completes successfully, including `daily-stats.processor.test.ts`.
2. **Failure path is covered by automated tests:** If aggregation or upsert fails, `process` resolves without throwing; `LoggerService.error` is invoked with a message that includes the Bull job id; `NotificationsService.emitQueueJobCompleted` is called with `jobType: 'daily-stats'` and `severity: 'error'`.
3. **Happy path unchanged:** Existing expectations still hold (e.g. empty DB → aggregate returns prior UTC day `YYYY-MM-DD` and zero counts; successful run still emits success notification).
4. **Build/typecheck:** Projects touched by the branch (`openthrottle-server`, `@openthrottle/nestjs-logging`) build or typecheck clean via Nx where applicable.
