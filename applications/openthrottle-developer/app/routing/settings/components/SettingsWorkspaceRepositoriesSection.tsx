import * as React from 'react';
import classnames from 'classnames';
import { Form, useNavigation } from 'react-router';
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Input,
  Label,
} from '@openthrottle/react-router-shadcn';
import type {
  WorkspaceLocalRepositoryFieldsFragment,
  GetWorkspaceSettingsQuery,
} from '~/__generated__/graphql';

type ProjectOption = GetWorkspaceSettingsQuery['projects'][number];

export interface SettingsWorkspaceRepositoriesSectionProps {
  readonly actionError?: string | null;
  readonly className?: string;
  readonly localRepositories: readonly WorkspaceLocalRepositoryFieldsFragment[];
  readonly projects: readonly ProjectOption[];
}

const NONE_PROJECT_VALUE = '__none__';

const ProjectSelect = (props: {
  readonly currentProjectId: string | null;
  readonly name: string;
  readonly projects: readonly ProjectOption[];
}): React.ReactElement => {
  const { currentProjectId, name, projects } = props;

  return (
    <select
      className="border-input bg-background focus:ring-ring h-10 w-full rounded-md border px-3 text-sm focus:outline-none focus:ring-2 focus:ring-offset-2"
      defaultValue={currentProjectId ?? NONE_PROJECT_VALUE}
      name={name}
    >
      <option value={NONE_PROJECT_VALUE}>No project</option>
      {projects.map((project) => (
        <option key={project.id} value={project.id}>
          {project.name}
        </option>
      ))}
    </select>
  );
};

const LocalRepositoryRow = (props: {
  readonly actionError?: string | null;
  readonly projects: readonly ProjectOption[];
  readonly repo: WorkspaceLocalRepositoryFieldsFragment;
}): React.ReactElement => {
  const { actionError, projects, repo } = props;
  const navigation = useNavigation();
  const isUpdating =
    navigation.state === 'submitting' &&
    navigation.formData?.get('intent') === 'updateRepo' &&
    navigation.formData?.get('id') === repo.id;
  const isDeleting =
    navigation.state === 'submitting' &&
    navigation.formData?.get('intent') === 'deleteRepo' &&
    navigation.formData?.get('id') === repo.id;

  return (
    <Card className="border-dashed" data-testid={`workspace-repo-${repo.id}`}>
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
            <ProjectSelect
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

export const SettingsWorkspaceRepositoriesSection = (
  props: SettingsWorkspaceRepositoriesSectionProps,
): React.ReactElement => {
  const { actionError, className, localRepositories, projects } = props;
  const navigation = useNavigation();
  const isCreating =
    navigation.state === 'submitting' &&
    navigation.formData?.get('intent') === 'createRepo';

  return (
    <section
      className={classnames('space-y-4', className)}
      data-testid="SettingsWorkspaceRepositoriesSection"
    >
      <Card>
        <CardHeader>
          <CardTitle>Local repositories</CardTitle>
          <p className="text-muted-foreground text-sm">
            Register directories on the machine running openthrottle-server.
            Paths must exist on that host and are validated when you add them.
          </p>
        </CardHeader>
        <CardContent>
          <Form className="space-y-4" method="post">
            <input name="intent" type="hidden" value="createRepo" />

            <div className="space-y-2">
              <Label htmlFor="new-repo-display-name">Label</Label>
              <Input
                id="new-repo-display-name"
                name="displayName"
                placeholder="OpenThrottle monorepo"
                required={true}
                type="text"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="new-repo-filesystem-path">Absolute path</Label>
              <Input
                id="new-repo-filesystem-path"
                name="filesystemPath"
                placeholder="/Users/you/Development/openthrottle"
                required={true}
                type="text"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="new-repo-project">
                Linked project (optional)
              </Label>
              <ProjectSelect
                currentProjectId={null}
                name="projectId"
                projects={projects}
              />
            </div>

            {actionError ? (
              <p className="text-destructive text-sm" role="alert">
                {actionError}
              </p>
            ) : null}

            <Button disabled={isCreating} type="submit" variant="outline">
              {isCreating ? 'Adding…' : 'Add repository'}
            </Button>
          </Form>
        </CardContent>
      </Card>

      {localRepositories.length === 0 ? (
        <p className="text-muted-foreground text-sm">
          No local repositories yet. Add one above.
        </p>
      ) : (
        <ul className="space-y-4">
          {localRepositories.map((repo) => (
            <li key={repo.id}>
              <LocalRepositoryRow
                actionError={actionError}
                projects={projects}
                repo={repo}
              />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
};
