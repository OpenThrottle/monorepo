import * as React from 'react';
import { Link } from 'react-router';
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@openthrottle/react-router-shadcn';
import { FolderGit2Icon, PencilIcon } from 'lucide-react';
import type { WorkspaceRepositoryFieldsFragment } from '~/__generated__/graphql';
import {
  WORKSPACE_FOLDERS_COPY,
  WORKSPACE_REPOSITORY_DETAIL_COPY,
} from '~/routing/settings/data/data.copy';

export interface RepositoryDetailProps {
  editTo: string;
  repository: WorkspaceRepositoryFieldsFragment;
}

export const RepositoryDetail = (
  props: RepositoryDetailProps,
): React.ReactElement => {
  const { editTo, repository } = props;

  // Hooks

  // Setup
  const checkouts = repository.checkouts ?? [];
  // The user's checkouts are flipped together, so any opted-in checkout means on.
  const injectionEnabled = checkouts.some(
    (checkout) => checkout.foreignSkillInjectionEnabled,
  );

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <div className="space-y-4" data-testid="RepositoryDetail">
      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-2">
          <div className="min-w-0 space-y-1">
            <CardTitle className="flex items-center gap-2 text-base">
              <FolderGit2Icon aria-hidden={true} className="size-4" />
              {repository.name}
            </CardTitle>
            <CardDescription className="font-mono text-xs">
              {repository.normalizedRemoteUrl ??
                WORKSPACE_REPOSITORY_DETAIL_COPY.remoteLocalOnly}
            </CardDescription>
          </div>
          <Button asChild={true} size="sm" variant="outline">
            <Link to={editTo}>
              <PencilIcon aria-hidden={true} className="size-3" />
              {WORKSPACE_REPOSITORY_DETAIL_COPY.editButton}
            </Link>
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          <dl className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="space-y-1">
              <dt className="text-muted-foreground text-xs">
                {WORKSPACE_REPOSITORY_DETAIL_COPY.remoteLabel}
              </dt>
              <dd className="font-mono text-sm break-all">
                {repository.normalizedRemoteUrl ??
                  WORKSPACE_REPOSITORY_DETAIL_COPY.remoteLocalOnly}
              </dd>
            </div>
            <div className="space-y-1">
              <dt className="text-muted-foreground text-xs">
                {WORKSPACE_REPOSITORY_DETAIL_COPY.branchLabel}
              </dt>
              <dd className="text-sm">{repository.defaultBranch ?? '—'}</dd>
            </div>
            <div className="space-y-1">
              <dt className="text-muted-foreground text-xs">
                {WORKSPACE_REPOSITORY_DETAIL_COPY.projectLabel}
              </dt>
              <dd className="text-sm">
                {repository.project?.name ??
                  WORKSPACE_REPOSITORY_DETAIL_COPY.noProject}
              </dd>
            </div>
            <div className="space-y-1">
              <dt className="text-muted-foreground text-xs">
                {WORKSPACE_REPOSITORY_DETAIL_COPY.injectionStatusLabel}
              </dt>
              <dd className="text-sm">
                <Badge variant={injectionEnabled ? 'default' : 'outline'}>
                  {injectionEnabled
                    ? WORKSPACE_REPOSITORY_DETAIL_COPY.injectionOn
                    : WORKSPACE_REPOSITORY_DETAIL_COPY.injectionOff}
                </Badge>
              </dd>
            </div>
          </dl>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            {WORKSPACE_REPOSITORY_DETAIL_COPY.checkoutsHeading}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {checkouts.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              {WORKSPACE_REPOSITORY_DETAIL_COPY.checkoutsEmpty}
            </p>
          ) : (
            <ul className="space-y-3">
              {checkouts.map((checkout) => {
                const branch =
                  checkout.inspection?.git.currentBranch ??
                  repository.defaultBranch ??
                  null;
                return (
                  <li
                    className="flex flex-wrap items-center justify-between gap-2 rounded-md border px-3 py-2"
                    data-testid={`RepositoryDetailCheckout-${checkout.id}`}
                    key={checkout.id}
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">
                        {checkout.displayName}
                      </p>
                      <p className="text-muted-foreground truncate font-mono text-xs">
                        {checkout.filesystemPath}
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      {branch ? (
                        <Badge variant="outline">{branch}</Badge>
                      ) : null}
                      {checkout.managed ? (
                        <Badge variant="secondary">
                          {WORKSPACE_FOLDERS_COPY.managedBadge}
                        </Badge>
                      ) : null}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
