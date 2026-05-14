const RUN_OUTPUT_DIR_ENV = 'OT_BULLMQ_RUN_OUTPUT_DIR';

/**
 * @description When set to a non-empty string, plan/workflow BullMQ workers append Ralph spawn
 * stdout/stderr to per-job JSONL under this directory via `KeyedJsonlWriter` from `@openthrottle/nestjs-logging`.
 */
export const getBullMqRunOutputBaseDirectory = (): string | undefined => {
  const raw = process.env[RUN_OUTPUT_DIR_ENV];

  if (typeof raw !== 'string') {
    return undefined;
  }

  const trimmed = raw.trim();

  return trimmed === '' ? undefined : trimmed;
};
