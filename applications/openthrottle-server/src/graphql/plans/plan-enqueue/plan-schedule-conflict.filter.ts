/**
 * @description Global filter that keeps the D8 schedule conflicts (OT plan 764c7654) out of the
 * error log. Nest's `ExternalExceptionFilter` logs every thrown `Error` that is not an
 * `IntrinsicException` at error level with its stack before rethrowing, and the conflicts are
 * `GraphQLError`s on purpose (see `createPlanScheduleConflictError`), so a stale tab clicking
 * Schedule produced a full stack trace for an outcome the client handles with a confirm dialog.
 *
 * Conflicts carrying a {@link PLAN_SCHEDULE_CONFLICT_CODE} are logged at warn as one line, without
 * a stack. Every other `GraphQLError` is logged exactly as Nest's default would have. Both are
 * rethrown unchanged, so the client response is identical either way.
 */

import type { ExceptionFilter } from '@nestjs/common';
import { Catch, Logger } from '@nestjs/common';
import { GraphQLError } from 'graphql';

import { PLAN_SCHEDULE_CONFLICT_CODE } from './plan-enqueue.constants.ts';

const SCHEDULE_CONFLICT_CODES: ReadonlySet<unknown> = new Set(
  Object.values(PLAN_SCHEDULE_CONFLICT_CODE),
);

@Catch(GraphQLError)
export class PlanScheduleConflictFilter implements ExceptionFilter<GraphQLError> {
  /** Same context name as Nest's default handler, so the log line reads the same. */
  private readonly logger = new Logger('ExceptionsHandler');

  catch(exception: GraphQLError): never {
    const { code } = exception.extensions;

    if (SCHEDULE_CONFLICT_CODES.has(code)) {
      this.logger.warn(`${String(code)}: ${exception.message}`);
    } else {
      this.logger.error(exception);
    }

    throw exception;
  }
}
