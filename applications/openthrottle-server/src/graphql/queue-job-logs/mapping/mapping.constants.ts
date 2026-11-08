/**
 * @description Pure mapping from a keyed run-output record (the
 * `{ timestamp, type, data, source? }` line shape written by `KeyedJsonlWriter`)
 * to the Phase 1 log tail API's user-facing fields: a derived severity `level`
 * and a sanitizable `message`. Kept free of GraphQL decorators and I/O so it is
 * unit-testable in isolation; the resolver composes this with the cursor codec
 * and (task 6) the redactor. See `docs/log-tail-api-design.md`.
 */

export const QUEUE_JOB_LOG_LEVELS = ['debug', 'info', 'warn', 'error'] as const;
