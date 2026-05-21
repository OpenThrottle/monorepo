import * as React from 'react';
import classnames from 'classnames';
import { Form, useNavigation } from 'react-router';
import {
  Button,
  Card,
  CardContent,
  Input,
  Label,
} from '@openthrottle/react-router-shadcn';
import type {
  WorkspaceLocalRepositoryFieldsFragment,
  GetWorkspaceSettingsQuery,
} from '~/__generated__/graphql';
import { OpenThrottleFieldset } from '@openthrottle/react-router-ui';

type ProjectOption = GetWorkspaceSettingsQuery['projects'][number];

export interface SettingsWorkspaceRepositoriesSectionProps {
  actionError?: string | null;
  className?: string;
  localRepositories: WorkspaceLocalRepositoryFieldsFragment[];
  projects: ProjectOption[];
}

const NONE_PROJECT_VALUE = '__none__';

export interface WorkspaceRepositoriesProjectSelectProps {
  currentProjectId: string | null;
  name: string;
  projects: ProjectOption[];
}

const WorkspaceRepositoriesProjectSelect = (
  props: WorkspaceRepositoriesProjectSelectProps,
) => {
  const { currentProjectId, name, projects } = props;

  // Hooks

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

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

export interface WorkspaceRepositoriesLocalRepositoryRowProps {
  actionError?: string | null;
  projects: ProjectOption[];
  repo: WorkspaceLocalRepositoryFieldsFragment;
}

const WorkspaceRepositoriesLocalRepositoryRow = (
  props: WorkspaceRepositoriesLocalRepositoryRowProps,
) => {
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
      className="border-dashed bg-background"
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

export const SettingsWorkspaceRepositoriesSection = (
  props: SettingsWorkspaceRepositoriesSectionProps,
) => {
  const { actionError, className, localRepositories, projects } = props;

  // Hooks
  const navigation = useNavigation();
  const isCreating =
    navigation.state === 'submitting' &&
    navigation.formData?.get('intent') === 'createRepo';

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <OpenThrottleFieldset
      id="settings-workspace-repositories-section"
      legend="Local repositories"
    >
      <section
        className={classnames('space-y-4 md:space-y-8', className)}
        data-testid="SettingsWorkspaceRepositoriesSection"
      >
        <p className="text-muted-foreground text-sm">
          Register directories on the machine running openthrottle-server. Paths
          must exist on that host and are validated when you add them.
        </p>

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
            <Label htmlFor="new-repo-project">Linked project (optional)</Label>
            <WorkspaceRepositoriesProjectSelect
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

        {localRepositories.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            No local repositories yet. Add one above.
          </p>
        ) : (
          <ul className="space-y-4">
            {localRepositories.map((repo) => (
              <li key={repo.id}>
                <WorkspaceRepositoriesLocalRepositoryRow
                  actionError={actionError}
                  projects={projects}
                  repo={repo}
                />
              </li>
            ))}
          </ul>
        )}
      </section>
    </OpenThrottleFieldset>
  );
};
