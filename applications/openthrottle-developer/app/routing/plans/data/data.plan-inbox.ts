/**
 * @description Display metadata for the plan inbox: the two kinds a human can
 * send a live run, and how each delivery status reads. FEEDBACK and RECORDED are
 * post-run reflection and never appear in the live-run inbox, so they have no
 * entry here.
 */
import type { BadgeProps } from '@openthrottle/react-router-shadcn';

import { PLAN_INBOX_COPY } from '~/routing/plans/data/data.copy';

export interface PlanInboxKindOption {
  readonly hint: string;
  readonly label: string;
  readonly placeholder: string;
  readonly value: 'QUEUE' | 'STEER';
}

/** Steer leads: it is the correction a human reaches for when a run goes wrong. */
export const PLAN_INBOX_KIND_OPTIONS: readonly PlanInboxKindOption[] = [
  {
    hint: PLAN_INBOX_COPY.kindHintSteer,
    label: PLAN_INBOX_COPY.kindSteer,
    placeholder: PLAN_INBOX_COPY.bodyPlaceholderSteer,
    value: 'STEER',
  },
  {
    hint: PLAN_INBOX_COPY.kindHintQueue,
    label: PLAN_INBOX_COPY.kindQueue,
    placeholder: PLAN_INBOX_COPY.bodyPlaceholderQueue,
    value: 'QUEUE',
  },
];

export interface PlanInboxStatusDisplay {
  readonly color: NonNullable<BadgeProps['color']>;
  readonly label: string;
}

export const PLAN_INBOX_STATUS_DISPLAY = {
  DELIVERED: { color: 'green', label: PLAN_INBOX_COPY.statusDelivered },
  PENDING: { color: 'amber', label: PLAN_INBOX_COPY.statusPending },
  WITHDRAWN: { color: 'slate', label: PLAN_INBOX_COPY.statusWithdrawn },
} as const satisfies Record<string, PlanInboxStatusDisplay>;

export const PLAN_INBOX_KIND_BADGE_COLOR = {
  QUEUE: 'blue',
  STEER: 'violet',
} as const satisfies Record<string, NonNullable<BadgeProps['color']>>;
