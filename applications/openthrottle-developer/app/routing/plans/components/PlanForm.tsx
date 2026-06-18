import * as React from 'react';
import {
  Button,
  Card,
  CardContent,
  CardFooter,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
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
  actionData?: { error?: string } | null;
  plan?: PlanDetailsFragment | null;
}

export const PlanForm = (props: PlanFormProps): React.ReactElement => {
  const { actionData, plan } = props;

  // Hooks

  // Setup
  const error = actionData?.error;
  const isEdit = plan != null;

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <Card className="w-full gap-8 p-8" data-testid="PlanForm">
      <CardContent className="pt-8">
        <Form className="flex w-full gap-4 md:gap-12" method="post">
          <div className="flex-1 space-y-4">
            {isEdit ? <Input name="id" type="hidden" value={plan.id} /> : null}
            <div>
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

            <div>
              <Label htmlFor="plan-category">Category</Label>
              <Select
                defaultValue={plan?.category ?? ''}
                name="category"
                required={true}
              >
                <SelectTrigger id="plan-category-trigger">
                  <SelectValue placeholder="Add permission…" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {PLAN_CATEGORIES.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="plan-author">Author</Label>
              <Input
                defaultValue={plan?.author ?? ''}
                id="plan-author"
                name="author"
                placeholder={
                  isEdit
                    ? 'e.g. visormatt'
                    : 'GitHub username; optional if API has GITHUB_USER'
                }
                required={isEdit}
                type="text"
              />
              {isEdit ? null : (
                <p className="text-muted-foreground mt-1 text-xs">
                  Leave blank only when the API server has GITHUB_USER set;
                  otherwise create will fail validation.
                </p>
              )}
            </div>

            <div>
              <Label htmlFor="plan-assignee">
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
              <Label htmlFor="plan-project">
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
              <Label htmlFor="plan-project-id">
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
              <Label htmlFor="plan-status">
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
              <p className="text-destructive text-sm" role="alert">
                {error}
              </p>
            ) : null}
          </div>

          <div className="flex flex-2 flex-col gap-8">
            <div>
              <Label htmlFor="plan-summary">
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
              <Label htmlFor="plan-description">
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
              <Button id="plan-submit-button" type="submit" variant="outline">
                {isEdit ? 'Update plan' : 'Create plan'}
              </Button>
            </CardFooter>
          </div>
        </Form>
      </CardContent>
    </Card>
  );
};
