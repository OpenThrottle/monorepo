import * as React from 'react';
import { Form, useNavigation } from 'react-router';
import {
  Button,
  Card,
  CardContent,
  Input,
  Label,
} from '@openthrottle/react-router-shadcn';
import type { WorkspaceLocalRepositoryFieldsFragment } from '~/__generated__/graphql';
import { WorkspaceRepositoriesProjectSelect } from '~/routing/settings/components/WorkspaceRepositoriesProjectSelect';
import type { ProjectOption } from '~/routing/settings/components/WorkspaceRepositoriesProjectSelect';

export interface WorkspaceRepositoriesLocalRepositoryRowProps {
  actionError?: string | null;
  projects: ProjectOption[];
  repo: WorkspaceLocalRepositoryFieldsFragment;
}

export const WorkspaceRepositoriesLocalRepositoryRow = (
  props: WorkspaceRepositoriesLocalRepositoryRowProps,
): React.ReactElement => {
  const { actionError, projects, repo } = props;

  // Hooks
  const navigation = useNavigation();
  const isUpdating =
    navigation.state === 'submitting' &&
    navigation.formData?.get('intent') === 'updateRepo' &&
    navigation.formData?.get('id') === repo.id;
  const isDeleting =
    navigation.state === 'submitting' &&
    navigation.formData?.get('intent') === 'deleteRepo' &&
    navigation.formData?.get('id') === repo.id;

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <Card
      className="bg-background border-dashed"
      data-testid={`workspace-repo-${repo.id}`}
    >
      <CardContent className="space-y-3 pt-6">
        <Form className="space-y-3" method="post">
          <input name="intent" type="hidden" value="updateRepo" />
          <input name="id" type="hidden" value={repo.id} />

          <div className="space-y-2">
            <Label htmlFor={`repo-display-${repo.id}`}>Label</Label>
            <Input
              defaultValue={repo.displayName}
              id={`repo-display-${repo.id}`}
              name="displayName"
              required={true}
              type="text"
            />
          </div>

          <div className="space-y-1">
            <Label>Path</Label>
            <p className="text-muted-foreground font-mono text-sm break-all">
              {repo.filesystemPath}
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor={`repo-project-${repo.id}`}>Linked project</Label>
            <WorkspaceRepositoriesProjectSelect
              currentProjectId={repo.projectId ?? null}
              name="projectId"
              projects={projects}
            />
          </div>

          {actionError ? (
            <p className="text-destructive text-sm" role="alert">
              {actionError}
            </p>
          ) : null}

          <div className="flex flex-wrap gap-2">
            <Button disabled={isUpdating} type="submit" variant="outline">
              {isUpdating ? 'Saving…' : 'Save'}
            </Button>
          </div>
        </Form>

        <Form method="post">
          <input name="intent" type="hidden" value="deleteRepo" />
          <input name="id" type="hidden" value={repo.id} />
          <Button disabled={isDeleting} type="submit" variant="destructive">
            {isDeleting ? 'Removing…' : 'Remove'}
          </Button>
        </Form>
      </CardContent>
    </Card>
  );
};
