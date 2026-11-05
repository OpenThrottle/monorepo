import {
  Badge,
  Button,
  Card,
  CardContent,
} from '@openthrottle/react-router-shadcn';
import { GlobalHeading } from '@openthrottle/react-router-ui-global';
import { FolderGit2Icon, PencilIcon } from 'lucide-react';
import * as React from 'react';
import { Link } from 'react-router';

import type { WorkspaceRepositoryFieldsFragment } from '~/__generated__/graphql';
import { WORKSPACE_REPOSITORY_DETAIL_COPY } from '~/routing/settings/data/data.copy';
import { RepositoryDetailCheckout } from '~/routing/settings/repositories/components/RepositoryDetailCheckout';

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

  const hasCheckouts = checkouts.length > 0;

  // Handlers

  // Markup
  const noCheckouts = (
    <p className="text-muted-foreground text-sm">
      {WORKSPACE_REPOSITORY_DETAIL_COPY.checkoutsEmpty}
    </p>
  );
  const checkoutList = (
    <div className="space-y-4 md:space-y-8">
      {checkouts.map((checkout) => (
        <RepositoryDetailCheckout
          checkout={checkout}
          defaultBranch={repository.defaultBranch}
          key={checkout.id}
        />
      ))}
    </div>
  );

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <>
      <div>
        <GlobalHeading
          className="mb-4"
          heading="h1"
          icon={FolderGit2Icon}
          title={repository.name}
        />
        <div className="flex items-center justify-between gap-2">
          <p className="text-muted-foreground text-sm">
            {repository.normalizedRemoteUrl ??
              WORKSPACE_REPOSITORY_DETAIL_COPY.remoteLocalOnly}
          </p>
          <Button asChild={true} size="xs" variant="secondary">
            <Link to={editTo}>
              <PencilIcon aria-hidden={true} className="size-3" />
              {WORKSPACE_REPOSITORY_DETAIL_COPY.editButton}
            </Link>
          </Button>
        </div>
      </div>

      <div className="space-y-4" data-testid="RepositoryDetail">
        <Card>
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
      </div>

      <div>
        <GlobalHeading
          className="mb-4"
          heading="h1"
          icon={FolderGit2Icon}
          title={WORKSPACE_REPOSITORY_DETAIL_COPY.checkoutsHeading}
        />
        <p className="text-muted-foreground text-sm">
          {WORKSPACE_REPOSITORY_DETAIL_COPY.checkoutsDescription}
        </p>
      </div>

      <div>{hasCheckouts ? checkoutList : noCheckouts}</div>
    </>
  );
};
