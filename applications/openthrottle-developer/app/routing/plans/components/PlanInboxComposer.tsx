import {
  Button,
  Input,
  Label,
  TextArea,
  toast,
  ToggleGroup,
  ToggleGroupItem,
} from '@openthrottle/react-router-shadcn';
import { Send } from 'lucide-react';
import * as React from 'react';
import { useFetcher } from 'react-router';

import type { action as planDetailAction } from '~/routes/plans.$planId._index';
import { PLAN_INBOX_COPY } from '~/routing/plans/data/data.copy';
import { PLAN_INBOX_KIND_OPTIONS } from '~/routing/plans/data/data.plan-inbox';

export interface PlanInboxComposerProps {
  readonly planId: string;
}

/**
 * @description Sends a STEER or QUEUE message to the plan's live run through the
 * route's `postPlanMessage` intent. The textarea is cleared only once the server
 * accepted the message, so a failed send never loses what the human typed.
 */
export const PlanInboxComposer = (
  props: PlanInboxComposerProps,
): React.ReactElement => {
  const { planId } = props;

  // Hooks
  const fetcher = useFetcher<typeof planDetailAction>();
  const busyRef = React.useRef(false);
  const [kind, setKind] = React.useState<'QUEUE' | 'STEER'>('STEER');
  const [body, setBody] = React.useState('');
  const bodyId = React.useId();

  // Setup
  const SendForm = fetcher.Form;
  const isSubmitting = fetcher.state !== 'idle';
  const selected =
    PLAN_INBOX_KIND_OPTIONS.find((option) => option.value === kind) ??
    PLAN_INBOX_KIND_OPTIONS[0];
  const canSend = body.trim().length > 0 && !isSubmitting;

  // Handlers
  const onKindChange = (value: string): void => {
    // Radix reports '' when the active item is clicked again; keep the choice.
    if (value === 'QUEUE' || value === 'STEER') setKind(value);
  };

  // Markup

  // Life Cycle
  React.useEffect(() => {
    const busy = fetcher.state !== 'idle';
    const data = fetcher.data;

    if (busyRef.current && !busy && data != null && typeof data === 'object') {
      if ('postPlanMessage' in data) {
        setBody('');
        toast.success(PLAN_INBOX_COPY.sentToast);
      } else if ('postPlanMessageError' in data) {
        toast.error(data.postPlanMessageError);
      }
    }
    busyRef.current = busy;
  }, [fetcher.state, fetcher.data]);

  // 🔌 Short Circuit

  return (
    <SendForm
      action={`/plans/${planId}`}
      className="flex flex-col gap-2"
      method="post"
    >
      <Input name="intent" type="hidden" value="postPlanMessage" />
      <Input name="kind" type="hidden" value={kind} />
      <div className="flex flex-wrap items-center gap-3">
        <ToggleGroup
          aria-label={PLAN_INBOX_COPY.kindLabel}
          onValueChange={onKindChange}
          size="sm"
          type="single"
          value={kind}
          variant="outline"
        >
          {PLAN_INBOX_KIND_OPTIONS.map((option) => (
            <ToggleGroupItem
              className="px-3"
              key={option.value}
              value={option.value}
            >
              {option.label}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
        <p className="text-muted-foreground text-xs">{selected?.hint}</p>
      </div>
      <Label className="sr-only" htmlFor={bodyId}>
        {PLAN_INBOX_COPY.bodyLabel}
      </Label>
      <TextArea
        id={bodyId}
        name="body"
        onChange={(event) => setBody(event.target.value)}
        placeholder={selected?.placeholder}
        rows={3}
        value={body}
      />
      <div className="flex justify-end">
        <Button disabled={!canSend} size="sm" type="submit">
          <Send aria-hidden={true} className="size-3.5 shrink-0" />
          {isSubmitting
            ? PLAN_INBOX_COPY.sendPendingLabel
            : PLAN_INBOX_COPY.sendLabel}
        </Button>
      </div>
    </SendForm>
  );
};
