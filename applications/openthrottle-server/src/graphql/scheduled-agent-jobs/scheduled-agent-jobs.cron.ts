/**
 * @description Cron validation for user-authored scheduled agent jobs. Shares the *structural* checks
 * with the database-backup validator (5/6 fields, char whitelist, fixed seconds so it can't fire
 * sub-minute) but applies a looser frequency floor: a bare every-minute pattern is rejected, while
 * steps/lists/ranges in the minutes field are allowed (a 15-minute step, a "0,30" list, etc.).
 */

const CRON_FIELD_PATTERN = /^[0-9*/,\-A-Za-z?]+$/;

const isFixedSecondsMinutes = (value: string): boolean =>
  /^\d{1,2}$/.test(value) && Number(value) >= 0 && Number(value) <= 59;

export interface CronValidationResult {
  readonly ok: boolean;
  readonly reason?: string;
}

/**
 * @description Validates a scheduled-agent-job cron pattern. Rejects: wrong field count, illegal
 * characters, a non-fixed seconds field (would fire sub-minute), and a bare `*` minutes field (would
 * fire every minute — too frequent for an agent run). Everything else in the minutes field
 * (steps/lists/ranges/fixed) is allowed.
 */
export const validateScheduledAgentJobCron = (
  pattern: string,
): CronValidationResult => {
  const fields = pattern.trim().split(/\s+/);

  if (fields.length !== 5 && fields.length !== 6) {
    return {
      ok: false,
      reason: `Expected a 5- or 6-field cron pattern, got ${fields.length} field(s).`,
    };
  }

  for (const field of fields) {
    if (!CRON_FIELD_PATTERN.test(field)) {
      return {
        ok: false,
        reason: `Illegal characters in cron field "${field}".`,
      };
    }
  }

  const hasSeconds = fields.length === 6;
  const secondsField = hasSeconds ? fields[0] : '0';
  const minutesField = hasSeconds ? fields[1] : fields[0];

  if (!isFixedSecondsMinutes(secondsField)) {
    return {
      ok: false,
      reason: `Seconds field "${secondsField}" must be a fixed value (0-59); a schedule may not fire sub-minute.`,
    };
  }

  if (minutesField === '*') {
    return {
      ok: false,
      reason: `A schedule may not run every minute; constrain the minutes field (e.g. "*/15" or "0").`,
    };
  }

  return { ok: true };
};
