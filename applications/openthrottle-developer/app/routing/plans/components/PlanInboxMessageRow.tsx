import { Badge, Button, Input, toast } from '@openthrottle/react-router-shadcn';
import * as React from 'react';
import { useFetcher } from 'react-router';

import type { PlanInboxMessageFragment } from '~/__generated__/graphql';
import type { action as planDetailAction } from '~/routes/plans.$planId._index';
import { PLAN_INBOX_COPY } from '~/routing/plans/data/data.copy';
import type { PlanInboxStatusDisplay } from '~/routing/plans/data/data.plan-inbox';
import {
  PLAN_INBOX_KIND_BADGE_COLOR,
  PLAN_INBOX_KIND_OPTIONS,
  PLAN_INBOX_STATUS_DISPLAY,
} from '~/routing/plans/data/data.plan-inbox';
import {
  formatDateShort,
  formatUpdatedAt,
} from '~/routing/plans/utils/formatters';

export interface PlanInboxMessageRowProps {
  /** Title of the task the message was delivered to, when it is on this plan. */
  readonly deliveredToTaskTitle: string | undefined;
  readonly message: PlanInboxMessageFragment;
  readonly planId: string;
}

/**
 * @description One inbox message: its kind, who sent it, its delivery status
 * and — once a run claimed it — which task it was delivered before. A message
 * still waiting can be withdrawn; delivered ones are history and immutable.
 */
export const PlanInboxMessageRow = (
  props: PlanInboxMessageRowProps,
): React.ReactElement => {
  const { deliveredToTaskTitle, message, planId } = props;
  const { kind, status: messageStatus } = message;

  // Hooks
  const fetcher = useFetcher<typeof planDetailAction>();
  const busyRef = React.useRef(false);

  // Setup
  const WithdrawForm = fetcher.Form;
  const isWithdrawing = fetcher.state !== 'idle';
  const isPending = message.status === 'PENDING';
  const kindLabel =
    PLAN_INBOX_KIND_OPTIONS.find((option) => option.value === message.kind)
      ?.label ?? message.kind;
  const isKnownKind = kind === 'QUEUE' || kind === 'STEER';
  const kindColor = isKnownKind ? PLAN_INBOX_KIND_BADGE_COLOR[kind] : 'slate';
  const isKnownStatus =
    messageStatus === 'DELIVERED' ||
    messageStatus === 'PENDING' ||
    messageStatus === 'WITHDRAWN';
  const status: PlanInboxStatusDisplay = isKnownStatus
    ? PLAN_INBOX_STATUS_DISPLAY[messageStatus]
    : { color: 'slate', label: messageStatus };
  const isDelivered = message.status === 'DELIVERED';
  const hasDeliveredTask = deliveredToTaskTitle != null;
  const deliveredTaskNote = hasDeliveredTask
    ? PLAN_INBOX_COPY.deliveredToTask(deliveredToTaskTitle)
    : PLAN_INBOX_COPY.deliveredUnknownTask;
  const deliveredNote = isDelivered ? deliveredTaskNote : null;
  const withdrawButtonLabel = isWithdrawing
    ? PLAN_INBOX_COPY.withdrawPendingLabel
    : PLAN_INBOX_COPY.withdrawLabel;

  // Handlers

  // Markup
  const withdrawControl = (
    <WithdrawForm action={`/plans/${planId}`} className="ml-auto" method="post">
      <Input name="intent" type="hidden" value="withdrawPlanMessage" />
      <Input name="id" type="hidden" value={message.id} />
      <Button
        aria-label={PLAN_INBOX_COPY.withdrawAriaLabel}
        disabled={isWithdrawing}
        size="xs"
        type="submit"
        variant="ghost"
      >
        {withdrawButtonLabel}
      </Button>
    </WithdrawForm>
  );

  // Life Cycle
  React.useEffect(() => {
    const busy = fetcher.state !== 'idle';
    const data = fetcher.data;

    if (busyRef.current && !busy && data != null && typeof data === 'object') {
      if ('withdrawPlanMessageError' in data) {
        toast.error(data.withdrawPlanMessageError);
      }
    }
    busyRef.current = busy;
  }, [fetcher.state, fetcher.data]);

  // 🔌 Short Circuit

  return (
    <li
      className="border-border flex flex-col gap-1.5 border-b py-3 last:border-b-0"
      data-status={message.status}
      data-testid="plan-inbox-message"
    >
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <Badge color={kindColor} size="xs">
          {kindLabel}
        </Badge>
        <Badge color={status.color} size="xs">
          {status.label}
        </Badge>
        <span className="text-muted-foreground">{message.author}</span>
        <time
          className="text-muted-foreground"
          dateTime={String(message.createdAt)}
          title={formatDateShort(message.createdAt) ?? undefined}
        >
          {formatUpdatedAt(message.createdAt)}
        </time>
        {isPending ? withdrawControl : null}
      </div>
      <p className="text-sm whitespace-pre-wrap">{message.body}</p>
      {deliveredNote != null ? (
        <p className="text-muted-foreground text-xs">{deliveredNote}</p>
      ) : null}
    </li>
  );
};
