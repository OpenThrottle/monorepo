import * as React from 'react';
import clsx from 'clsx';
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

export interface ProjectFormDefaultValues {
  description?: string | null;
  name?: string | null;
  nxProjectName?: string | null;
}

export interface ProjectFormProps {
  actionData?: { error?: string } | null;
  cancelTo?: string;
  className?: string;
  defaultValues?: ProjectFormDefaultValues;
  submitLabel?: string;
}

export const ProjectForm = (props: ProjectFormProps): React.ReactElement => {
  const {
    actionData,
    cancelTo = '/projects',
    className,
    defaultValues,
    submitLabel = 'Create project',
  } = props;

  // Hooks

  // Setup
  const error = actionData?.error;

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <Card className={clsx('w-full', className)} data-testid="ProjectForm">
      <CardContent>
        <Form className="w-full space-y-4 pt-8" method="post">
          <div className="space-y-2">
            <Label htmlFor="project-name">Name</Label>
            <Input
              defaultValue={defaultValues?.name ?? undefined}
              id="project-name"
              name="name"
              placeholder="Project name"
              required={true}
              type="text"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="project-description">Description (optional)</Label>
            <TextArea
              defaultValue={defaultValues?.description ?? undefined}
              id="project-description"
              name="description"
              placeholder="Project description"
              rows={4}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="project-nx-project-name">
              NX project name (optional)
            </Label>
            <Input
              defaultValue={defaultValues?.nxProjectName ?? undefined}
              id="project-nx-project-name"
              name="nxProjectName"
              placeholder="e.g. openthrottle-developer"
              type="text"
            />
          </div>

          {error ? (
            <p className="text-destructive text-sm" role="alert">
              {error}
            </p>
          ) : null}

          <CardFooter className="flex justify-end gap-3 p-0 pt-4">
            <Button asChild={true} variant="ghost">
              <Link to={cancelTo}>Cancel</Link>
            </Button>
            <Button type="submit" variant="outline">
              {submitLabel}
            </Button>
          </CardFooter>
        </Form>
      </CardContent>
    </Card>
  );
};
