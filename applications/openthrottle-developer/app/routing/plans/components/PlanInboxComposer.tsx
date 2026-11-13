import {
  Button,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  TextArea,
  toast,
  ToggleGroup,
  ToggleGroupItem,
} from '@openthrottle/react-router-shadcn';
import { Send } from 'lucide-react';
import * as React from 'react';
import { useFetcher } from 'react-router';

import type { PlanTaskRowFragment } from '~/__generated__/graphql';
import type { action as planDetailAction } from '~/routes/plans.$planId._index';
import { PLAN_INBOX_COPY } from '~/routing/plans/data/data.copy';
import {
  PLAN_INBOX_KIND_OPTIONS,
  PLAN_INBOX_NO_TASK_VALUE,
} from '~/routing/plans/data/data.plan-inbox';
import { filterOutHookTasks } from '~/routing/plans/utils/hook-tasks';
import { sortPlanTasksByListOrder } from '~/routing/plans/utils/sortPlanTasksByListOrder';

export interface PlanInboxComposerProps {
  readonly planId: string;
  /** The plan's tasks; the message can optionally be about one of them. */
  readonly tasks: readonly PlanTaskRowFragment[];
}

/**
 * @description Sends a STEER or QUEUE message to the plan's live run through the
 * route's `postPlanMessage` intent. The textarea is cleared only once the server
 * accepted the message, so a failed send never loses what the human typed.
 */
export const PlanInboxComposer = (
  props: PlanInboxComposerProps,
): React.ReactElement => {
  const { planId, tasks } = props;

  // Hooks
  const fetcher = useFetcher<typeof planDetailAction>();
  const busyRef = React.useRef(false);
  const [kind, setKind] = React.useState<'QUEUE' | 'STEER'>('STEER');
  const [body, setBody] = React.useState('');
  const [pickedTaskId, setPickedTaskId] = React.useState<string | undefined>(
    undefined,
  );
  const bodyId = React.useId();
  const taskId = React.useId();

  // Setup
  const SendForm = fetcher.Form;
  const isSubmitting = fetcher.state !== 'idle';
  const selected =
    PLAN_INBOX_KIND_OPTIONS.find((option) => option.value === kind) ??
    PLAN_INBOX_KIND_OPTIONS[0];
  const taskOptions = React.useMemo(
    () => sortPlanTasksByListOrder(filterOutHookTasks(tasks)),
    [tasks],
  );
  // Until the human picks, follow the in-flight task: it is what they are
  // most likely looking at when they steer.
  const defaultTaskId = taskOptions.find(
    (task) => task.status === 'IN_PROGRESS',
  )?.id;
  const aboutTaskId = pickedTaskId ?? defaultTaskId;
  const canSend = body.trim().length > 0 && !isSubmitting;

  // Handlers
  const onKindChange = (value: string): void => {
    // Radix reports '' when the active item is clicked again; keep the choice.
    if (value === 'QUEUE' || value === 'STEER') setKind(value);
  };

  const onTaskChange = (value: string): void => {
    setPickedTaskId(value === PLAN_INBOX_NO_TASK_VALUE ? '' : value);
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
      {aboutTaskId ? (
        <Input name="taskId" type="hidden" value={aboutTaskId} />
      ) : null}
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
      <div className="flex flex-wrap items-center gap-2">
        <Label className="text-muted-foreground text-xs" htmlFor={taskId}>
          {PLAN_INBOX_COPY.taskLabel}
        </Label>
        <Select
          onValueChange={onTaskChange}
          value={aboutTaskId || PLAN_INBOX_NO_TASK_VALUE}
        >
          <SelectTrigger className="h-8 w-64 max-w-full text-xs" id={taskId}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={PLAN_INBOX_NO_TASK_VALUE}>
              {PLAN_INBOX_COPY.taskNone}
            </SelectItem>
            {taskOptions.map((task) => (
              <SelectItem key={task.id} value={task.id}>
                {task.title ?? 'Untitled'}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
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
