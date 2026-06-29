/**
 * @description Redaction for log tail event messages (OT plan 3c397432, task 6).
 * Produces the user-facing message for a keyed run-output record by extracting it
 * (see `queue-job-log-mapping`) and then running the **shared** server log
 * redactor's pattern pass over it, so credentials interpolated into run output
 * (Authorization/Bearer/Basic/Token values, JWTs, emails) never reach the API
 * response or the live-tail subscription.
 *
 * Reusing `DEFAULT_LOG_REDACTOR` from `@openthrottle/nestjs-logging` (the same
 * redactor applied at the JSONL logging chokepoint) keeps the log tail's redaction
 * rules aligned with the rest of the server, as the plan requires.
 *
 * Scope note: this applies value-pattern redaction to the rendered message
 * string. Keyed run lines are CLI stdout/stderr/meta text, not structured
 * credential objects, so key-name deny-list redaction over object `data` is not
 * needed for v1; if structured credential payloads ever land in run output,
 * extend this to run `DEFAULT_LOG_REDACTOR.redactValue` over the object first.
 */

import { DEFAULT_LOG_REDACTOR } from '@openthrottle/nestjs-logging';
import {
  extractQueueJobLogMessage,
  type QueueJobLogSourceRecord,
} from './queue-job-log-mapping';

/**
 * @description Extract and redact the message for a log event. Always use this
 * (not the raw {@link extractQueueJobLogMessage}) when building an event returned
 * to clients or published on the tail subscription.
 */
export const buildRedactedQueueJobLogMessage = (
  data: QueueJobLogSourceRecord['data'],
): string => DEFAULT_LOG_REDACTOR.redactString(extractQueueJobLogMessage(data));
