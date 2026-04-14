import * as React from 'react';
import classnames from 'classnames';
import {
  Button,
  Card,
  CardContent,
  CardFooter,
  Input,
  Label,
  TextArea,
} from '@openthrottle/react-router-shadcn';
import { Form, Link } from 'react-router';
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

  // Hooks

  // Setup
  const error = actionData?.error;
  const isEdit = plan != null;

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <Card className={classnames('w-full', className)} data-testid="PlanForm">
      <CardContent className="pt-8">
        <Form className="gap-4 md:gap-8 w-full flex" method="post">
          <div className="flex-1 space-y-4">
            {isEdit ? <Input name="id" type="hidden" value={plan.id} /> : null}
            <div>
              <Label className="mb-2 block" htmlFor="plan-title">
                Title
              </Label>
              <Input
                defaultValue={plan?.title ?? ''}
                id="plan-title"
                name="title"
                placeholder="Plan title"
                required={true}
                type="text"
              />
            </div>

            <div>
              <Label className="mb-2 block" htmlFor="plan-category">
                Category
              </Label>
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

            <div>
              <Label className="mb-2 block" htmlFor="plan-author">
                Author
              </Label>
              <Input
                defaultValue={plan?.author ?? ''}
                id="plan-author"
                name="author"
                placeholder="e.g. visormatt"
                required={true}
                type="text"
              />
            </div>

            <div>
              <Label className="mb-2 block" htmlFor="plan-assignee">
                Assignee{' '}
                <span className="text-muted-foreground italic">(optional)</span>
              </Label>
              <Input
                defaultValue={plan?.assignee ?? ''}
                id="plan-assignee"
                name="assignee"
                placeholder="e.g. visormatt"
                type="text"
              />
            </div>

            <div>
              <Label className="mb-2 block" htmlFor="plan-project">
                Project{' '}
                <span className="text-muted-foreground italic">(optional)</span>
              </Label>
              <Input
                id="plan-project"
                name="project"
                placeholder="Project name"
                type="text"
              />
            </div>

            <div>
              <Label className="mb-2 block" htmlFor="plan-project-id">
                Project ID{' '}
                <span className="text-muted-foreground italic">(optional)</span>
              </Label>
              <Input
                defaultValue={plan?.projectId ?? ''}
                id="plan-project-id"
                name="projectId"
                placeholder="Project UUID"
                type="text"
              />
            </div>

            <div>
              <Label className="mb-2 block" htmlFor="plan-status">
                Status{' '}
                <span className="text-muted-foreground italic">(optional)</span>
              </Label>
              <Input
                defaultValue={plan?.status ?? ''}
                id="plan-status"
                name="status"
                placeholder="e.g. PENDING"
                type="text"
              />
            </div>

            {error ? (
              <p className="text-sm text-destructive" role="alert">
                {error}
              </p>
            ) : null}
          </div>

          <div className="gap-8 flex flex-col flex-2">
            <div>
              <Label className="mb-2 block" htmlFor="plan-summary">
                Summary{' '}
                <span className="text-muted-foreground italic">(optional)</span>
              </Label>
              <TextArea
                defaultValue={plan?.summary ?? ''}
                id="plan-summary"
                name="summary"
                placeholder="Short summary"
                rows={3}
              />
            </div>

            <div className="flex-1">
              <Label className="mb-2 block" htmlFor="plan-description">
                Description{' '}
                <span className="text-muted-foreground italic">(optional)</span>
              </Label>
              <TextArea
                className="h-full flex-1"
                defaultValue={plan?.description ?? ''}
                id="plan-description"
                name="description"
                placeholder="Plan description"
              />
            </div>

            <CardFooter className="flex justify-end gap-3 p-0 pt-4">
              <Button asChild={true} variant="ghost">
                <Link to={isEdit && plan ? `/plans/${plan.id}` : '/plans'}>
                  Cancel
                </Link>
              </Button>
              <Button type="submit" variant="outline">
                {isEdit ? 'Update plan' : 'Create plan'}
              </Button>
            </CardFooter>
          </div>
        </Form>
      </CardContent>
    </Card>
  );
};
