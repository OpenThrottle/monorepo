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
import type { PlanDetailsFragment } from '~/__generated__/graphql';

const PLAN_CATEGORIES = [
  'feature',
  'ideas',
  'infrastructure',
  'other',
  'product',
] as const;

export interface PlanFormProps {
  readonly actionData?: { error?: string } | null;
  readonly className?: string;
  readonly plan?: PlanDetailsFragment | null;
}

export const PlanForm = (props: PlanFormProps) => {
  const { actionData, className, plan } = props;
  const error = actionData?.error;
  const isEdit = plan != null;

  // Hooks

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <Card className={classnames('w-full', className)} data-testid="PlanForm">
      <CardContent className="pt-8">
        <Form className="w-full space-y-4" method="post">
          {isEdit ? <input name="id" type="hidden" value={plan.id} /> : null}
          <div className="space-y-2">
            <Label htmlFor="plan-title">Title</Label>
            <Input
              defaultValue={plan?.title ?? ''}
              id="plan-title"
              name="title"
              placeholder="Plan title"
              required={true}
              type="text"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="plan-category">Category</Label>
            <select
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              defaultValue={plan?.category ?? ''}
              id="plan-category"
              name="category"
              required={true}
            >
              <option value="">Select category</option>
              {PLAN_CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="plan-author">Author</Label>
            <Input
              defaultValue={plan?.author ?? ''}
              id="plan-author"
              name="author"
              placeholder="e.g. visormatt"
              required={true}
              type="text"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="plan-assignee">Assignee (optional)</Label>
            <Input
              defaultValue={plan?.assignee ?? ''}
              id="plan-assignee"
              name="assignee"
              placeholder="e.g. visormatt"
              type="text"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="plan-description">Description (optional)</Label>
            <TextArea
              defaultValue={plan?.description ?? ''}
              id="plan-description"
              name="description"
              placeholder="Plan description"
              rows={4}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="plan-project">Project (optional)</Label>
            <Input
              id="plan-project"
              name="project"
              placeholder="Project name"
              type="text"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="plan-project-id">Project ID (optional)</Label>
            <Input
              defaultValue={plan?.projectId ?? ''}
              id="plan-project-id"
              name="projectId"
              placeholder="Project UUID"
              type="text"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="plan-status">Status (optional)</Label>
            <Input
              defaultValue={plan?.status ?? ''}
              id="plan-status"
              name="status"
              placeholder="e.g. PENDING"
              type="text"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="plan-summary">Summary (optional)</Label>
            <TextArea
              defaultValue={plan?.summary ?? ''}
              id="plan-summary"
              name="summary"
              placeholder="Short summary"
              rows={3}
            />
          </div>

          {error ? (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          ) : null}

          <CardFooter className="flex gap-3 p-0 pt-4">
            <Button type="submit">
              {isEdit ? 'Update plan' : 'Create plan'}
            </Button>
            <Button asChild={true} variant="outline">
              <Link to={isEdit && plan ? `/plans/${plan.id}` : '/plans'}>
                Cancel
              </Link>
            </Button>
          </CardFooter>
        </Form>
      </CardContent>
    </Card>
  );
};
