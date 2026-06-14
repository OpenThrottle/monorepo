import * as React from 'react';
import classnames from 'classnames';
import { Form, Link } from 'react-router';
import {
  Button,
  Input,
  Label,
  TextArea,
} from '@openthrottle/react-router-shadcn';
import { toDatetimeLocalValue } from '~/routing/calendar/utils/formatters';
import type { CalendarEvent } from '~/routing/calendar/types';

export interface CalendarFormProps {
  action: 'create' | 'update';
  className?: string;
  event?: CalendarEvent;
}

export const CalendarForm = (props: CalendarFormProps): React.ReactElement => {
  const { action, className, event } = props;

  // Hooks

  // Setup
  const isCreate = action === 'create';

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <div>
      <Form
        className={classnames('w-full', className)}
        data-testid="CalendarForm"
        method="post"
      >
        <div className="w-full space-y-4">
          <div>
            <Label htmlFor="title">Title</Label>
            <Input
              defaultValue={event?.title}
              id="title"
              name="title"
              required={true}
              type="text"
            />
          </div>
          <div>
            <Label htmlFor="location">Location</Label>
            <Input
              defaultValue={event?.location}
              id="location"
              name="location"
              type="text"
            />
          </div>
          <div>
            <Label htmlFor="description">Description</Label>
            <TextArea
              defaultValue={event?.description}
              id="description"
              name="description"
              rows={4}
            />
          </div>
          <div className="flex flex-wrap gap-4">
            <div className="flex-1">
              <Label htmlFor="startsAt">Starts at</Label>
              <Input
                defaultValue={
                  event ? toDatetimeLocalValue(event.startsAt) : undefined
                }
                id="startsAt"
                name="startsAt"
                required={true}
                type="datetime-local"
              />
            </div>
            <div className="flex-1">
              <Label htmlFor="endsAt">Ends at</Label>
              <Input
                defaultValue={
                  event ? toDatetimeLocalValue(event.endsAt) : undefined
                }
                id="endsAt"
                name="endsAt"
                type="datetime-local"
              />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Input
              className="size-4"
              defaultChecked={event?.allDay}
              id="allDay"
              name="allDay"
              type="checkbox"
            />
            <Label htmlFor="allDay">All day</Label>
          </div>
        </div>

        <div className="mt-6 flex gap-3">
          <Button type="submit">
            {isCreate ? 'Create event' : 'Update event'}
          </Button>
          <Button asChild={true} variant="outline">
            <Link to="/calendar">Cancel</Link>
          </Button>
        </div>
      </Form>
    </div>
  );
};
