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
import { PLAN_CATEGORIES } from '~/routing/plans/data/plan-form-categories';
import { PlanFormFieldError } from '~/routing/plans/components/PlanFormFieldError';
import { PlanFormOptionalFields } from '~/routing/plans/components/PlanFormOptionalFields';
import type {
  PlanFormActionData,
  PlanFormField,
} from '~/routing/plans/data/plan-form-action-data';
import type { PlanDetailsFragment } from '~/__generated__/graphql';

export interface PlanFormProps {
  actionData?: PlanFormActionData | null;
  plan?: PlanDetailsFragment | null;
}

export const PlanForm = (props: PlanFormProps): React.ReactElement => {
  const { actionData, plan } = props;

  // Hooks

  // Setup
  const error = actionData?.error;
  const errorField = actionData?.field;
  const isEdit = plan != null;

  // 🚨 Prefer the values echoed back by a failed submit so nothing the user
  // typed is lost; fall back to the loaded plan (edit) or empty (create).
  const submitted = actionData?.values;

  const initial = {
    assignee: submitted?.assignee ?? plan?.assignee ?? '',
    author: submitted?.author ?? plan?.author ?? '',
    category: submitted?.category ?? plan?.category ?? '',
    description: submitted?.description ?? plan?.description ?? '',
    project: submitted?.project ?? '',
    projectId: submitted?.projectId ?? plan?.projectId ?? '',
    status: submitted?.status ?? plan?.status ?? '',
    summary: submitted?.summary ?? plan?.summary ?? '',
    title: submitted?.title ?? plan?.title ?? '',
  };

  // Handlers

  // Markup
  const markupFieldError = (field: PlanFormField): React.ReactElement | null =>
    error != null && errorField === field ? (
      <PlanFormFieldError field={field} message={error} />
    ) : null;

  const describedBy = (field: PlanFormField): string | undefined =>
    errorField === field ? `plan-${field}-error` : undefined;

  // 🚨 Form-level fallback: an error we could not attribute to a field must
  // still be visible, otherwise a failed submit looks like nothing happened.
  const markupFormError =
    error != null && errorField == null ? (
      <PlanFormFieldError message={error} />
    ) : null;

  const markupOptional = (
    <span className="text-muted-foreground italic">(optional)</span>
  );

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
                aria-describedby={describedBy('title')}
                aria-invalid={errorField === 'title'}
                defaultValue={initial.title}
                id="plan-title"
                name="title"
                placeholder="Plan title"
                required={true}
                type="text"
              />
              {markupFieldError('title')}
            </div>

            <div>
              <Label htmlFor="plan-category-trigger">Category</Label>
              {/* 🚨 Do NOT add `required` here: Radix renders a hidden,
                  unfocusable native select, so the browser silently refuses to
                  submit and can never show its validation bubble. The action
                  validates instead and the error renders below. */}
              <Select defaultValue={initial.category} name="category">
                <SelectTrigger
                  aria-describedby={describedBy('category')}
                  aria-invalid={errorField === 'category'}
                  id="plan-category-trigger"
                >
                  <SelectValue placeholder="Select a category…" />
                </SelectTrigger>
                <SelectContent>
                  {PLAN_CATEGORIES.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {markupFieldError('category')}
            </div>

            <div>
              <Label htmlFor="plan-author">Author</Label>
              <Input
                aria-describedby={describedBy('author')}
                aria-invalid={errorField === 'author'}
                defaultValue={initial.author}
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
              {markupFieldError('author')}
              {isEdit ? null : (
                <p className="text-muted-foreground mt-1 text-xs">
                  Leave blank only when the API server has GITHUB_USER set;
                  otherwise create will fail validation.
                </p>
              )}
            </div>

            <PlanFormOptionalFields
              assignee={initial.assignee}
              project={initial.project}
              projectId={initial.projectId}
              status={initial.status}
            />

            {markupFormError}
          </div>

          <div className="flex flex-2 flex-col gap-8">
            <div>
              <Label htmlFor="plan-summary">Summary {markupOptional}</Label>
              <TextArea
                defaultValue={initial.summary}
                id="plan-summary"
                name="summary"
                placeholder="Short summary"
                rows={3}
              />
            </div>

            <div className="flex-1">
              <Label htmlFor="plan-description">
                Description {markupOptional}
              </Label>
              <TextArea
                className="h-full flex-1"
                defaultValue={initial.description}
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
