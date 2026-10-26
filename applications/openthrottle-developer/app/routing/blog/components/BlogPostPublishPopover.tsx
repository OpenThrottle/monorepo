import {
  Button,
  Input,
  Label,
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@openthrottle/react-router-shadcn';
import { CalendarClockIcon, SendIcon } from 'lucide-react';
import * as React from 'react';

import { BLOG_LIFECYCLE_COPY } from '~/routing/blog/data/data.copy';
import { formatBlogTimeZoneName } from '~/routing/blog/utils/formatters';
import {
  isoToDateTimeLocalValue,
  localDateTimeToUtcIso,
  toDateTimeLocalValue,
  validateScheduleLocalDateTime,
} from '~/routing/blog/utils/schedule';

export interface BlogPostPublishPopoverProps {
  /** `publish` offers publishing now; `reschedule` is for a scheduled post. */
  readonly action: 'publish' | 'reschedule';
  readonly disabled: boolean;
  /** Publishes now (`null`), or schedules for a UTC ISO timestamp. */
  readonly onPublish: (publishedAt: string | null) => void;
  /** The post's current go-live time (UTC ISO), to prefill a reschedule. */
  readonly publishedAt: string | null;
}

/**
 * @description The publish control: a popover offering "Publish now" or
 * "Schedule for…". The schedule input is a `datetime-local` field in the
 * viewer's own time zone; it is converted to a UTC ISO timestamp on submit, and
 * a time that is not in the future is rejected inline before anything is sent.
 */
export const BlogPostPublishPopover = (
  props: BlogPostPublishPopoverProps,
): React.ReactElement => {
  const { action, disabled, onPublish, publishedAt } = props;

  // Hooks
  const [open, setOpen] = React.useState(false);
  const [local, setLocal] = React.useState('');
  const [error, setError] = React.useState<string | null>(null);

  // Setup
  const copy = BLOG_LIFECYCLE_COPY.popover;
  const Icon = action === 'reschedule' ? CalendarClockIcon : SendIcon;
  const errorId = 'blog-post-schedule-error';
  const now = new Date();

  // Handlers
  const handleOpenChange = (next: boolean): void => {
    if (next) {
      setLocal(isoToDateTimeLocalValue(publishedAt));
      setError(null);
    }

    setOpen(next);
  };

  const handlePublishNow = (): void => {
    setOpen(false);
    onPublish(null);
  };

  const handleSchedule = (): void => {
    const iso = localDateTimeToUtcIso(local);
    const message = validateScheduleLocalDateTime(local, Date.now());

    if (message !== null || iso === null) {
      setError(message ?? BLOG_LIFECYCLE_COPY.errors.required);

      return;
    }

    setOpen(false);
    onPublish(iso);
  };

  const handleLocalChange = (
    event: React.ChangeEvent<HTMLInputElement>,
  ): void => {
    setLocal(event.target.value);
    setError(null);
  };

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <Popover onOpenChange={handleOpenChange} open={open}>
      <PopoverTrigger asChild={true}>
        <Button disabled={disabled} size="sm" type="button">
          <Icon className="size-4" />
          {BLOG_LIFECYCLE_COPY.actions[action]}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        className="flex w-80 flex-col gap-4"
        data-testid="BlogPostPublishPopover"
      >
        <div className="flex flex-col gap-1.5">
          <Button onClick={handlePublishNow} size="sm" type="button">
            <SendIcon className="size-4" />
            {copy.publishNow}
          </Button>
          <p className="text-muted-foreground text-xs">{copy.publishNowHint}</p>
        </div>
        <div className="border-t" />
        <div className="flex flex-col gap-1.5">
          <p className="text-sm font-medium">{copy.scheduleHeading}</p>
          <Label htmlFor="blog-post-schedule-at">{copy.scheduleLabel}</Label>
          <Input
            aria-describedby={error ? errorId : undefined}
            aria-invalid={error ? true : undefined}
            id="blog-post-schedule-at"
            min={toDateTimeLocalValue(now)}
            onChange={handleLocalChange}
            type="datetime-local"
            value={local}
          />
          <p className="text-muted-foreground text-xs">
            {copy.timeZoneHint(formatBlogTimeZoneName(now, undefined))}
          </p>
          {error ? (
            <p className="text-destructive text-xs" id={errorId} role="alert">
              {error}
            </p>
          ) : null}
          <Button
            onClick={handleSchedule}
            size="sm"
            type="button"
            variant="outline"
          >
            <CalendarClockIcon className="size-4" />
            {copy.scheduleSubmit}
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
};
