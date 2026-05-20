import * as React from 'react';
import classnames from 'classnames';
import { Form, Link } from 'react-router';
import {
  Button,
  Card,
  CardContent,
  CardFooter,
  Input,
  Label,
  TextArea,
} from '@openthrottle/react-router-shadcn';
import type { GetTaskByIdQuery } from '~/__generated__/graphql';

interface TaskFormProps {
  readonly actionData?: { error?: string } | null;
  readonly className?: string;
  readonly planId: string;
  readonly task?: GetTaskByIdQuery['task'] | null;
}

export const TaskForm = (props: TaskFormProps) => {
  const { actionData, className, planId, task } = props;
  const error = actionData?.error;
  const isEdit = task != null;

  // Hooks

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <Card className={classnames('w-full', className)} data-testid="TaskForm">
      <CardContent className="pt-8">
        <Form className="w-full space-y-4" method="post">
          <Input name="planId" type="hidden" value={planId} />
          {isEdit && task ? (
            <Input name="id" type="hidden" value={task.id} />
          ) : null}

          <div className="space-y-2">
            <Label htmlFor="task-title">Title</Label>
            <Input
              defaultValue={task?.title ?? ''}
              id="task-title"
              name="title"
              placeholder="Task title"
              required={true}
              type="text"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="task-status">Status (optional)</Label>
            <Input
              defaultValue={task?.status ?? ''}
              id="task-status"
              name="status"
              placeholder="e.g. PENDING"
              type="text"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="task-assignee">Assignee (optional)</Label>
            <Input
              defaultValue={task?.assignee ?? ''}
              id="task-assignee"
              name="assignee"
              placeholder="e.g. visormatt"
              type="text"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="task-category">Category (optional)</Label>
            <Input
              defaultValue={task?.category ?? ''}
              id="task-category"
              name="category"
              placeholder="e.g. implementation"
              type="text"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="task-description">Description (optional)</Label>
            <TextArea
              defaultValue={task?.description ?? ''}
              id="task-description"
              name="description"
              placeholder="Task description"
              rows={4}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="task-summary">Summary (optional)</Label>
            <TextArea
              defaultValue={task?.summary ?? ''}
              id="task-summary"
              name="summary"
              placeholder="Short summary"
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="task-requirements">
              Requirements JSON (optional)
            </Label>
            <TextArea
              defaultValue={task?.requirementsJson ?? ''}
              id="task-requirements"
              name="requirements"
              placeholder='["Requirement 1", "Requirement 2"]'
              rows={2}
            />
          </div>

          {error ? (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          ) : null}

          <CardFooter className="flex gap-3 p-0 pt-4">
            <Button type="submit">
              {isEdit ? 'Update task' : 'Save task'}
            </Button>
            <Button asChild={true} variant="outline">
              <Link to={`/plans/${planId}`}>Cancel</Link>
            </Button>
          </CardFooter>
        </Form>
      </CardContent>
    </Card>
  );
};
