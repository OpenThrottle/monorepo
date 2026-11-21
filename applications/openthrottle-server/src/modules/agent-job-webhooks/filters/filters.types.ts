import type { ScheduledAgentJobWebhookFilter } from '@openthrottle/nestjs-repositories-server';

/** @description The data a filter path can read: the parsed payload and the allow-listed headers (lowercase names). */
export interface WebhookFilterContext {
  readonly headers: Readonly<Record<string, string>>;
  readonly payload: unknown;
}

/** @description Outcome of evaluating every filter: all matched, or the index of the first that did not. */
export type WebhookFilterResult =
  | { readonly failedIndex: number; readonly matched: false }
  | { readonly matched: true };

/** @description Outcome of validating filters authored by a user. */
export type WebhookFilterValidation =
  | {
      readonly filters: readonly ScheduledAgentJobWebhookFilter[];
      readonly ok: true;
    }
  | { readonly message: string; readonly ok: false };

/** @description A filter as authored in the GraphQL input, before validation. */
export interface WebhookFilterDraft {
  readonly op: string;
  readonly path: string;
  readonly value: string | null | undefined;
  readonly values: readonly string[] | null | undefined;
}
