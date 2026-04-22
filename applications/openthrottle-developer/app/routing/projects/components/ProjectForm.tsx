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

export interface ProjectFormProps {
  readonly actionData?: { error?: string } | null;
  readonly className?: string;
}

export const ProjectForm = (props: ProjectFormProps) => {
  const { actionData, className } = props;
  const error = actionData?.error;

  // Hooks

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <Card className={classnames('w-full', className)} data-testid="ProjectForm">
      <CardContent>
        <Form className="w-full space-y-4 pt-8" method="post">
          <div className="space-y-2">
            <Label htmlFor="project-name">Name</Label>
            <Input
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
              id="project-nx-project-name"
              name="nxProjectName"
              placeholder="e.g. openthrottle-developer"
              type="text"
            />
          </div>

          {error ? (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          ) : null}

          <CardFooter className="flex justify-end gap-3 p-0 pt-4">
            <Button asChild={true} variant="ghost">
              <Link to="/projects">Cancel</Link>
            </Button>
            <Button type="submit" variant="outline">
              Create project
            </Button>
          </CardFooter>
        </Form>
      </CardContent>
    </Card>
  );
};
