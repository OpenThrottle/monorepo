import type { ProfileExecutionRedactor } from '../profile-execution-redaction.types.ts';
import { createProfileExecutionRedactor } from '../profile-execution-redaction.utils.ts';

/** Shared default redactor instance used when capture is enabled without a custom redactor. */
export const defaultProfileExecutionRedactor: ProfileExecutionRedactor =
  createProfileExecutionRedactor();
