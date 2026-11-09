import type { LogRedactor } from '../log-redaction.types.ts';
import { createLogRedactor } from '../log-redaction.utils.ts';

/**
 * @description Default-on redactor used when no module `redaction` option is configured. Covers
 * the common credential/PII deny-list and value patterns; redacts `message` by default.
 */
export const DEFAULT_LOG_REDACTOR: LogRedactor = createLogRedactor();
