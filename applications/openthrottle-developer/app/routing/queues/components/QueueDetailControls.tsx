import * as React from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
  Button,
  toast,
} from '@openthrottle/react-router-shadcn';
import { useFetcher } from 'react-router';
import { PauseIcon, PlayIcon, Trash2Icon } from 'lucide-react';
import clsx from 'clsx';

export interface QueueDetailControlsProps {
  className?: string;
  queueName: string;
}

/** Action-result payload from the queue detail route, surfaced as a toast. */
export interface QueueDetailControlsActionData {
  cleaned?: { queueName: string; removedCount: number };
  error?: string;
  paused?: string;
  resumed?: string;
}

/**
 * @description Queue-level ops controls for the detail header: pause, resume, and a guarded clean
 * (completed/failed only) behind a confirm dialog. Submits to the route action via a fetcher.
 */
export const QueueDetailControls = (
  props: QueueDetailControlsProps,
): React.ReactElement => {
  const { className, queueName } = props;

  // Hooks
  const fetcher = useFetcher<QueueDetailControlsActionData>();
  const handledRef = React.useRef<QueueDetailControlsActionData | null>(null);

  // Setup
  const isBusy = fetcher.state !== 'idle';

  // Handlers
  const submit = React.useCallback(
    (fields: Record<string, string>) => {
      fetcher.submit({ ...fields, queueName }, { method: 'post' });
    },
    [fetcher, queueName],
  );

  // Markup

  // Life Cycle
  React.useEffect(() => {
    if (fetcher.state !== 'idle' || !fetcher.data) {
      return;
    }
    if (handledRef.current === fetcher.data) {
      return;
    }
    handledRef.current = fetcher.data;

    const data = fetcher.data;
    if (data.error != null && data.error !== '') {
      toast.error(data.error);
    } else if (data.paused != null && data.paused !== '') {
      toast.success(`Paused ${data.paused}`);
    } else if (data.resumed != null && data.resumed !== '') {
      toast.success(`Resumed ${data.resumed}`);
    } else if (data.cleaned != null) {
      toast.success(
        `Removed ${data.cleaned.removedCount} job(s) from ${data.cleaned.queueName}`,
      );
    }
  }, [fetcher.state, fetcher.data]);

  // 🔌 Short Circuit

  return (
    <div
      className={clsx('flex flex-wrap items-center gap-2', className)}
      data-testid="QueueDetailControls"
    >
      <Button
        disabled={isBusy}
        onClick={() => submit({ intent: 'pauseQueue' })}
        size="sm"
        type="button"
        variant="outline"
      >
        <PauseIcon className="h-4 w-4" /> Pause
      </Button>
      <Button
        disabled={isBusy}
        onClick={() => submit({ intent: 'resumeQueue' })}
        size="sm"
        type="button"
        variant="outline"
      >
        <PlayIcon className="h-4 w-4" /> Resume
      </Button>

      <AlertDialog>
        <AlertDialogTrigger asChild={true}>
          <Button disabled={isBusy} size="sm" type="button" variant="outline">
            <Trash2Icon className="h-4 w-4" /> Clean…
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Clean finished jobs</AlertDialogTitle>
            <AlertDialogDescription>
              Permanently remove finished jobs from{' '}
              <span className="font-medium">{queueName}</span>. Only completed
              or failed jobs are removed — waiting, active, and delayed jobs are
              never touched. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() =>
                submit({
                  confirm: 'true',
                  intent: 'cleanQueue',
                  state: 'completed',
                })
              }
            >
              Remove completed
            </AlertDialogAction>
            <AlertDialogAction
              onClick={() =>
                submit({
                  confirm: 'true',
                  intent: 'cleanQueue',
                  state: 'failed',
                })
              }
            >
              Remove failed
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
