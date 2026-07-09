/**
 * @description Registers the `QueueJobLogLevel` GraphQL enum (code-first) from the
 * single source of truth in `queue-job-log-mapping` (`QUEUE_JOB_LOG_LEVELS`), so
 * the SDL enum and the derivation logic can never drift. The runtime enum object
 * (`QueueJobLogLevelEnum`) is what `@Field(() => ...)` references; the string-union
 * `QueueJobLogLevel` type stays the TS-level field type.
 */

import { registerEnumType } from '@nestjs/graphql';
import {
  QUEUE_JOB_LOG_LEVELS,
  type QueueJobLogLevel,
} from './queue-job-log-mapping';

/**
 * @description Runtime enum object (`{ debug: 'debug', ... }`) for code-first
 * registration. Built from {@link QUEUE_JOB_LOG_LEVELS} so values stay in lockstep.
 */
export const QueueJobLogLevelEnum: Readonly<Record<string, QueueJobLogLevel>> =
  Object.fromEntries(
    QUEUE_JOB_LOG_LEVELS.map(
      (level): readonly [QueueJobLogLevel, QueueJobLogLevel] => [level, level],
    ),
  );

registerEnumType(QueueJobLogLevelEnum, {
  description:
    'Severity bucket for a keyed run-output log event (derived; see field semantics).',
  name: 'QueueJobLogLevel',
});
