/**
 * @description Parses the webhook form's FormData into the GraphQL trigger input shared by create and
 * update. The server re-validates every range; this shapes strings into the input and rejects the
 * mistakes a form can make before a round trip (a custom preset with no signature header, an `in`
 * filter with no values, more than 16 filters).
 */
import type { CreateScheduledAgentJobWebhookTriggerInputType } from '~/__generated__/graphql';
import { SCHEDULE_WEBHOOK_COPY } from '~/routing/schedule/data/copy';
import {
  WEBHOOK_FILTER_NO_VALUE_OPS,
  WEBHOOK_FILTER_OP,
  WEBHOOK_LIMITS,
  WEBHOOK_PRESET,
} from '~/routing/schedule/data/webhook';

export type WebhookTriggerFields = Omit<
  CreateScheduledAgentJobWebhookTriggerInputType,
  'scheduledAgentJobId'
>;

export type ParsedWebhookForm =
  | { readonly error: string; readonly ok: false }
  | { readonly input: WebhookTriggerFields; readonly ok: true };

interface ParsedFilter {
  readonly op: string;
  readonly path: string;
  readonly value?: string;
  readonly values?: string[];
}

const text = (form: FormData, key: string): string | undefined => {
  const value = form.get(key);

  if (typeof value !== 'string') {
    return undefined;
  }
  const trimmed = value.trim();

  return trimmed === '' ? undefined : trimmed;
};

const wholeNumber = (form: FormData, key: string): number | undefined => {
  const raw = text(form, key);
  const value = raw === undefined ? Number.NaN : Number(raw);

  return Number.isFinite(value) ? Math.round(value) : undefined;
};

const strings = (form: FormData, key: string): string[] => {
  return form
    .getAll(key)
    .map((value) => (typeof value === 'string' ? value.trim() : ''));
};

const splitValues = (raw: string): string[] => {
  return raw
    .split(',')
    .map((value) => value.trim())
    .filter((value) => value !== '');
};

/** One filter row, or an error message. A row with a blank path is an empty row and is skipped. */
const parseFilter = (
  path: string,
  op: string,
  raw: string,
): ParsedFilter | string | null => {
  if (path === '') {
    return null;
  }

  if (WEBHOOK_FILTER_NO_VALUE_OPS.includes(op)) {
    return { op, path };
  }

  if (op === WEBHOOK_FILTER_OP.in) {
    const values = splitValues(raw);
    const isValid =
      values.length > 0 && values.length <= WEBHOOK_LIMITS.filterValuesMax;

    return isValid ? { op, path, values } : SCHEDULE_WEBHOOK_COPY.filterInError;
  }

  return raw === ''
    ? SCHEDULE_WEBHOOK_COPY.filterValueError
    : { op, path, value: raw };
};

const parseFilters = (
  form: FormData,
): { filters: ParsedFilter[] } | { error: string } => {
  const paths = strings(form, 'filterPath');
  const ops = strings(form, 'filterOp');
  const values = strings(form, 'filterValue');
  const filters: ParsedFilter[] = [];

  for (const [index, path] of paths.entries()) {
    const parsed = parseFilter(path, ops[index] ?? '', values[index] ?? '');

    if (typeof parsed === 'string') {
      return { error: parsed };
    }
    if (parsed !== null) {
      filters.push(parsed);
    }
  }

  return filters.length > WEBHOOK_LIMITS.filtersMax
    ? { error: SCHEDULE_WEBHOOK_COPY.filterCountError }
    : { filters };
};

export const parseWebhookForm = (form: FormData): ParsedWebhookForm => {
  const preset = text(form, 'signaturePreset') ?? WEBHOOK_PRESET.generic;
  const isCustom = preset === WEBHOOK_PRESET.custom;
  const signatureHeader = text(form, 'signatureHeader');
  const parsedFilters = parseFilters(form);

  if (isCustom && signatureHeader === undefined) {
    return { error: SCHEDULE_WEBHOOK_COPY.signatureHeaderError, ok: false };
  }
  if ('error' in parsedFilters) {
    return { error: parsedFilters.error, ok: false };
  }

  const coalesceSeconds = wholeNumber(form, 'coalesceWindowSeconds');

  return {
    input: {
      coalesceWindowMs:
        coalesceSeconds === undefined ? undefined : coalesceSeconds * 1000,
      deliveryIdHeader: isCustom
        ? (text(form, 'deliveryIdHeader') ?? null)
        : undefined,
      enabled: form.get('enabled') === 'true',
      filters: parsedFilters.filters,
      maxInFlight: wholeNumber(form, 'maxInFlight'),
      rateLimitPerMinute: wholeNumber(form, 'rateLimitPerMinute'),
      signatureEncoding: isCustom ? text(form, 'signatureEncoding') : undefined,
      signatureHeader: isCustom ? signatureHeader : undefined,
      signaturePreset: preset,
      timestampHeader: isCustom
        ? (text(form, 'timestampHeader') ?? null)
        : undefined,
      timestampToleranceSeconds: wholeNumber(form, 'timestampToleranceSeconds'),
    },
    ok: true,
  };
};
