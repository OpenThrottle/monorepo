import * as React from 'react';
import { Link } from 'react-router';
import { GlobalHeading } from '@openthrottle/react-router-ui-global';
import {
  Badge,
  Button,
  Card,
  CardContent,
} from '@openthrottle/react-router-shadcn';
import { FolderGit2Icon, PencilIcon } from 'lucide-react';
import type { WorkspaceRepositoryFieldsFragment } from '~/__generated__/graphql';
import {
  WORKSPACE_FOLDERS_COPY,
  WORKSPACE_REPOSITORY_DETAIL_COPY,
} from '~/routing/settings/data/data.copy';
import { deriveCheckoutInspectionBadges } from '~/routing/settings/repositories/utils/checkout-inspection-badges';

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

      <div>
        {checkouts.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            {WORKSPACE_REPOSITORY_DETAIL_COPY.checkoutsEmpty}
          </p>
        ) : (
          <div className="space-y-4 md:space-y-8">
            {checkouts.map((checkout) => {
              const branch =
                checkout.inspection?.git.currentBranch ??
                repository.defaultBranch ??
                null;
              const { detectedAgentConfig, detectedStack } =
                deriveCheckoutInspectionBadges(checkout.inspection);
              return (
                <Card
                  className="space-y-2 rounded-md border px-3 py-2"
                  data-testid={`RepositoryDetailCheckout-${checkout.id}`}
                  key={checkout.id}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
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
                  </div>
                  {detectedStack.length > 0 ? (
                    <div className="flex flex-wrap items-center gap-1">
                      <span className="text-muted-foreground w-24 shrink-0 text-xs">
                        {WORKSPACE_REPOSITORY_DETAIL_COPY.stackLabel}
                      </span>
                      {detectedStack.map((item) => (
                        <Badge key={item} variant="outline">
                          {item}
                        </Badge>
                      ))}
                    </div>
                  ) : null}
                  {detectedAgentConfig.length > 0 ? (
                    <div className="flex flex-wrap items-center gap-1">
                      <span className="text-muted-foreground w-24 shrink-0 text-xs">
                        {WORKSPACE_REPOSITORY_DETAIL_COPY.agentConfigLabel}
                      </span>
                      {detectedAgentConfig.map((item) => (
                        <Badge key={item} variant="outline">
                          {item}
                        </Badge>
                      ))}
                    </div>
                  ) : null}
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
};
