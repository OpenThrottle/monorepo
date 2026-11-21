import type {
  ScheduledAgentJobWebhookFilter,
  ScheduledAgentJobWebhookFilterOp,
} from '@openthrottle/nestjs-repositories-server';
import {
  SCHEDULED_AGENT_JOB_WEBHOOK_FILTER_OPS,
  SCHEDULED_AGENT_JOB_WEBHOOK_LIMITS,
} from '@openthrottle/nestjs-repositories-server';

import type {
  WebhookFilterContext,
  WebhookFilterDraft,
  WebhookFilterResult,
  WebhookFilterValidation,
} from './filters.types.ts';

/** @description Own-property check (never the prototype chain); the lib target predates `Object.hasOwn`. */
const hasOwnKey = (target: object, key: string): boolean => {
  return Object.keys(target).includes(key);
};

const HEADER_PATH_PREFIX = 'header:';
const BLOCKED_SEGMENTS: ReadonlySet<string> = new Set([
  '__proto__',
  'constructor',
  'prototype',
]);

const isFilterOp = (
  value: unknown,
): value is ScheduledAgentJobWebhookFilterOp => {
  return SCHEDULED_AGENT_JOB_WEBHOOK_FILTER_OPS.some((op) => op === value);
};

/** @description A payload value reduced to the string form filters compare by, or undefined when it is not a scalar. */
const toComparable = (value: unknown): string | undefined => {
  if (typeof value === 'string') {
    return value;
  }

  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }

  return undefined;
};

/** @description Walks a dot path through own properties only (no prototype access); arrays index by number. */
const readPayloadPath = (payload: unknown, path: string): unknown => {
  let current: unknown = payload;

  for (const segment of path.split('.')) {
    if (BLOCKED_SEGMENTS.has(segment)) {
      return undefined;
    }

    if (Array.isArray(current)) {
      const index = Number(segment);
      current = Number.isInteger(index) ? current[index] : undefined;
    } else if (
      typeof current === 'object' &&
      current !== null &&
      hasOwnKey(current, segment)
    ) {
      current = Reflect.get(current, segment);
    } else {
      return undefined;
    }
  }

  return current;
};

/** @description The value a filter path addresses: an allow-listed header, or a dot path into the payload. */
const readFilterValue = (
  path: string,
  context: WebhookFilterContext,
): unknown => {
  if (path.startsWith(HEADER_PATH_PREFIX)) {
    const name = path.slice(HEADER_PATH_PREFIX.length).toLowerCase();

    return hasOwnKey(context.headers, name) ? context.headers[name] : undefined;
  }

  return readPayloadPath(context.payload, path);
};

const matchesFilter = (
  filter: ScheduledAgentJobWebhookFilter,
  context: WebhookFilterContext,
): boolean => {
  const actual = readFilterValue(filter.path, context);
  const present = actual !== undefined && actual !== null;
  const comparable = toComparable(actual);

  switch (filter.op) {
    case 'exists': {
      return present;
    }
    case 'not_exists': {
      return !present;
    }
    case 'equals': {
      return comparable !== undefined && comparable === filter.value;
    }
    case 'not_equals': {
      return comparable === undefined || comparable !== filter.value;
    }
    case 'in': {
      return (
        comparable !== undefined &&
        Array.isArray(filter.value) &&
        filter.value.includes(comparable)
      );
    }
    case 'prefix': {
      return (
        comparable !== undefined &&
        typeof filter.value === 'string' &&
        comparable.startsWith(filter.value)
      );
    }
  }
};

/**
 * @description Evaluates the filters in order, all of which must match (AND). Returns the index of
 * the first that does not. Plain string comparison only: no regex, so attacker-controlled payload
 * text cannot trigger catastrophic backtracking.
 */
export const evaluateWebhookFilters = (
  filters: readonly ScheduledAgentJobWebhookFilter[],
  context: WebhookFilterContext,
): WebhookFilterResult => {
  for (const [index, filter] of filters.entries()) {
    if (!matchesFilter(filter, context)) {
      return { failedIndex: index, matched: false };
    }
  }

  return { matched: true };
};

/**
 * @description Validates user-authored filters: at most 16, a known op (no regex), a non-empty
 * path, a string value for equals / not_equals / prefix, 1 to 32 values for `in`, and nothing
 * extra for exists / not_exists.
 */
export const validateWebhookFilters = (
  drafts: readonly WebhookFilterDraft[],
): WebhookFilterValidation => {
  if (drafts.length > SCHEDULED_AGENT_JOB_WEBHOOK_LIMITS.filtersMax) {
    return {
      message: `At most ${SCHEDULED_AGENT_JOB_WEBHOOK_LIMITS.filtersMax} filters are allowed`,
      ok: false,
    };
  }

  const filters: ScheduledAgentJobWebhookFilter[] = [];

  for (const [index, draft] of drafts.entries()) {
    const label = `Filter ${index + 1}`;
    const path = draft.path.trim();

    if (!isFilterOp(draft.op)) {
      return { message: `${label}: unknown op "${draft.op}"`, ok: false };
    }

    if (path === '') {
      return { message: `${label}: path is required`, ok: false };
    }

    if (draft.op === 'exists' || draft.op === 'not_exists') {
      filters.push({ op: draft.op, path, value: undefined });
    } else if (draft.op === 'in') {
      const values = draft.values ?? [];

      if (
        values.length === 0 ||
        values.length > SCHEDULED_AGENT_JOB_WEBHOOK_LIMITS.filterInValuesMax
      ) {
        return {
          message: `${label}: "in" needs 1 to ${SCHEDULED_AGENT_JOB_WEBHOOK_LIMITS.filterInValuesMax} values`,
          ok: false,
        };
      }

      filters.push({ op: draft.op, path, value: [...values] });
    } else {
      if (draft.value === null || draft.value === undefined) {
        return { message: `${label}: "${draft.op}" needs a value`, ok: false };
      }

      filters.push({ op: draft.op, path, value: draft.value });
    }
  }

  return { filters, ok: true };
};
