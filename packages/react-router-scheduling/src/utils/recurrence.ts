/**
 * Build and parse RFC 5545 RRULE strings for the subset the Schedule-X
 * `event-recurrence` engine supports. These helpers are pure (no engine import)
 * so they unit-test in isolation and let callers work with a structured spec
 * instead of hand-writing RRULE strings.
 *
 * The supported subset is hand-rolled rather than pulling the full `rrule`
 * library: the engine only honors `FREQ` plus `COUNT`/`INTERVAL`/`UNTIL`/
 * `BYDAY`/`BYMONTHDAY`/`WKST`, so the extra dependency (and its bundle cost in a
 * source-first package) is not warranted.
 */

import type { RecurrenceRule } from '../types';

/**
 * Supported recurrence frequencies (RRULE `FREQ`). Modeled as an `as const`
 * object rather than a TypeScript enum.
 *
 * @publicApi
 */
export const RecurrenceFrequency = {
  Daily: 'DAILY',
  Monthly: 'MONTHLY',
  Weekly: 'WEEKLY',
  Yearly: 'YEARLY',
} as const;

/**
 * Union of the supported {@link RecurrenceFrequency} values.
 *
 * @publicApi
 */
export type RecurrenceFrequency =
  (typeof RecurrenceFrequency)[keyof typeof RecurrenceFrequency];

/**
 * Two-letter weekday codes used by RRULE `BYDAY` / `WKST`.
 *
 * @publicApi
 */
export const RecurrenceWeekday = {
  Friday: 'FR',
  Monday: 'MO',
  Saturday: 'SA',
  Sunday: 'SU',
  Thursday: 'TH',
  Tuesday: 'TU',
  Wednesday: 'WE',
} as const;

/**
 * Union of the supported {@link RecurrenceWeekday} values.
 *
 * @publicApi
 */
export type RecurrenceWeekday =
  (typeof RecurrenceWeekday)[keyof typeof RecurrenceWeekday];

/**
 * A structured recurrence specification covering the engine-supported RRULE
 * subset. {@link buildRRule} turns it into a {@link RecurrenceRule}; the only
 * required field is {@link RecurrenceSpec.frequency}.
 *
 * @publicApi
 */
export interface RecurrenceSpec {
  /** Days of the week the event recurs on (RRULE `BYDAY`). */
  byDay?: RecurrenceWeekday[];
  /** Days of the month the event recurs on, 1–31 (RRULE `BYMONTHDAY`). */
  byMonthDay?: number[];
  /** Total number of occurrences (RRULE `COUNT`). Mutually exclusive with `until`. */
  count?: number;
  /** How often the series repeats (RRULE `FREQ`). */
  frequency: RecurrenceFrequency;
  /** Repeat every N periods of `frequency` (RRULE `INTERVAL`). */
  interval?: number;
  /** Last date/datetime the series runs, as an RRULE `UNTIL` value. */
  until?: string;
  /** The day the week starts on (RRULE `WKST`). */
  weekStart?: RecurrenceWeekday;
}

const FREQUENCIES = new Set<string>(Object.values(RecurrenceFrequency));
const WEEKDAYS = new Set<string>(Object.values(RecurrenceWeekday));

function isFrequency(value: string): value is RecurrenceFrequency {
  return FREQUENCIES.has(value);
}

function isWeekday(value: string): value is RecurrenceWeekday {
  return WEEKDAYS.has(value);
}

function parseWeekdays(value: string): RecurrenceWeekday[] {
  return value.split(',').map((code) => {
    if (!isWeekday(code)) {
      throw new Error(`Unsupported RRULE weekday: ${code}`);
    }

    return code;
  });
}

function parseIntegers(value: string): number[] {
  return value.split(',').map((part) => {
    const parsed = Number(part);
    if (!Number.isInteger(parsed)) {
      throw new Error(`Invalid RRULE integer: ${part}`);
    }

    return parsed;
  });
}

/**
 * Build an RFC 5545 {@link RecurrenceRule} from a structured {@link RecurrenceSpec}.
 * Parts are emitted in a stable order (`FREQ` first), and empty list fields are
 * omitted.
 *
 * @publicApi
 */
export function buildRRule(spec: RecurrenceSpec): RecurrenceRule {
  const parts: string[] = [`FREQ=${spec.frequency}`];

  if (spec.interval !== undefined) parts.push(`INTERVAL=${spec.interval}`);
  if (spec.count !== undefined) parts.push(`COUNT=${spec.count}`);
  if (spec.until !== undefined) parts.push(`UNTIL=${spec.until}`);
  if (spec.byDay !== undefined && spec.byDay.length > 0) {
    parts.push(`BYDAY=${spec.byDay.join(',')}`);
  }

  if (spec.byMonthDay !== undefined && spec.byMonthDay.length > 0) {
    parts.push(`BYMONTHDAY=${spec.byMonthDay.join(',')}`);
  }

  if (spec.weekStart !== undefined) parts.push(`WKST=${spec.weekStart}`);

  return { rule: parts.join(';') };
}

/**
 * Parse an RFC 5545 RRULE string (with or without a leading `RRULE:`) into a
 * structured {@link RecurrenceSpec}. Throws on a missing/invalid `FREQ` or an
 * unsupported `BYDAY`/`WKST` weekday; unknown parts are ignored.
 *
 * @publicApi
 */
export function parseRRule(rule: RecurrenceRule | string): RecurrenceSpec {
  const raw = typeof rule === 'string' ? rule : rule.rule;
  const body = raw.replace(/^RRULE:/i, '');
  const parts = new Map<string, string>();

  for (const segment of body.split(';')) {
    if (segment === '') continue;

    const [key, value] = segment.split('=');
    if (key !== undefined && value !== undefined) {
      parts.set(key.toUpperCase(), value);
    }
  }

  const freq = parts.get('FREQ');
  if (freq === undefined || !isFrequency(freq)) {
    throw new Error(`Unsupported or missing RRULE FREQ: ${freq ?? '(none)'}`);
  }

  const spec: RecurrenceSpec = { frequency: freq };

  const interval = parts.get('INTERVAL');
  if (interval !== undefined) spec.interval = parseIntegers(interval)[0];

  const count = parts.get('COUNT');
  if (count !== undefined) spec.count = parseIntegers(count)[0];

  const until = parts.get('UNTIL');
  if (until !== undefined) spec.until = until;

  const byDay = parts.get('BYDAY');
  if (byDay !== undefined) spec.byDay = parseWeekdays(byDay);

  const byMonthDay = parts.get('BYMONTHDAY');
  if (byMonthDay !== undefined) spec.byMonthDay = parseIntegers(byMonthDay);

  const weekStart = parts.get('WKST');
  if (weekStart !== undefined) {
    if (!isWeekday(weekStart)) {
      throw new Error(`Unsupported RRULE WKST weekday: ${weekStart}`);
    }

    spec.weekStart = weekStart;
  }

  return spec;
}
