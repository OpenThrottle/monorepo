import * as React from 'react';
import clsx from 'clsx';
import { Form, useNavigation } from 'react-router';
import { Button, Input, Label } from '@openthrottle/react-router-shadcn';
import type { WorkspaceLocalRepositoryFieldsFragment } from '~/__generated__/graphql';
import { OpenThrottleFieldset } from '@openthrottle/react-router-ui';
import { FolderGit2Icon } from 'lucide-react';
import { WorkspaceRepositoriesProjectSelect } from '~/routing/settings/components/WorkspaceRepositoriesProjectSelect';
import type { ProjectOption } from '~/routing/settings/components/WorkspaceRepositoriesProjectSelect';
import { WorkspaceRepositoriesLocalRepositoryRow } from '~/routing/settings/components/WorkspaceRepositoriesLocalRepositoryRow';

export interface SettingsWorkspaceRepositoriesSectionProps {
  actionError?: string | null;
  className?: string;
  localRepositories: WorkspaceLocalRepositoryFieldsFragment[];
  projects: ProjectOption[];
}

export const SettingsWorkspaceRepositoriesSection = (
  props: SettingsWorkspaceRepositoriesSectionProps,
): React.ReactElement => {
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
      icon={FolderGit2Icon}
      id="local-repositories"
      legend="Local Repositories"
    >
      <section
        className={clsx('space-y-4 md:space-y-8', className)}
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
