import * as React from 'react';
import { Form, Link, useNavigation } from 'react-router';
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@openthrottle/react-router-shadcn';
import { FolderGit2Icon, RefreshCwIcon } from 'lucide-react';
import type { WorkspaceRepositoryFieldsFragment } from '~/__generated__/graphql';
import { WORKSPACE_FOLDERS_COPY } from '~/routing/settings/data/data.copy';

export interface CheckoutDrift {
  branchMoved: boolean;
  pathMissing: boolean;
  remoteChanged: boolean;
}

export interface WorkspaceRepositoryCardProps {
  driftByCheckoutId?: Record<string, CheckoutDrift>;
  repository: WorkspaceRepositoryFieldsFragment;
}

const driftLabels = (drift: CheckoutDrift): string[] => {
  const labels: string[] = [];
  if (drift.branchMoved) labels.push(WORKSPACE_FOLDERS_COPY.driftBranchMoved);
  if (drift.pathMissing) labels.push(WORKSPACE_FOLDERS_COPY.driftPathMissing);
  if (drift.remoteChanged) {
    labels.push(WORKSPACE_FOLDERS_COPY.driftRemoteChanged);
  }
  return labels;
};

export const WorkspaceRepositoryCard = (
  props: WorkspaceRepositoryCardProps,
): React.ReactElement => {
  const { driftByCheckoutId, repository } = props;

  // Hooks
  const navigation = useNavigation();

  // Setup
  const checkouts = repository.checkouts ?? [];
  const detailPath = `/settings/workspace/repositories/${repository.id}`;
  const refreshingCheckoutId =
    navigation.state === 'submitting' &&
    navigation.formData?.get('intent') === 'refreshCheckout'
      ? navigation.formData.get('id')
      : null;

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <Card data-testid="WorkspaceRepositoryCard">
      <CardHeader className="flex flex-row items-start justify-between gap-2">
        <div className="min-w-0 space-y-1">
          <CardTitle className="flex items-center gap-2 text-base">
            <FolderGit2Icon aria-hidden={true} className="size-4" />
            <Link className="hover:underline" to={detailPath}>
              {repository.name}
            </Link>
          </CardTitle>
          <CardDescription className="font-mono text-xs">
            {repository.normalizedRemoteUrl ??
              'Local only (no remote detected)'}
          </CardDescription>
        </div>
        <Button asChild={true} size="sm" variant="outline">
          <Link to={detailPath}>{WORKSPACE_FOLDERS_COPY.detailsButton}</Link>
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        <ul className="space-y-3">
          {checkouts.map((checkout) => {
            const drift = driftByCheckoutId?.[checkout.id];
            const warnings = drift ? driftLabels(drift) : [];
            const branch =
              checkout.inspection?.git.currentBranch ??
              repository.defaultBranch ??
              null;
            return (
              <li
                className="space-y-2 rounded-md border px-3 py-2"
                data-testid={`WorkspaceRepositoryCardCheckout-${checkout.id}`}
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
                    {branch ? <Badge variant="outline">{branch}</Badge> : null}
                    {checkout.managed ? (
                      <Badge variant="secondary">
                        {WORKSPACE_FOLDERS_COPY.managedBadge}
                      </Badge>
                    ) : null}
                  </div>
                </div>

                {warnings.length > 0 ? (
                  <ul className="space-y-1" role="alert">
                    {warnings.map((warning) => (
                      <li className="text-destructive text-xs" key={warning}>
                        {warning}
                      </li>
                    ))}
                  </ul>
                ) : null}

                <div className="flex flex-wrap gap-2">
                  <Form method="post">
                    <input
                      name="intent"
                      type="hidden"
                      value="refreshCheckout"
                    />
                    <input name="id" type="hidden" value={checkout.id} />
                    <Button
                      disabled={refreshingCheckoutId === checkout.id}
                      size="sm"
                      type="submit"
                      variant="outline"
                    >
                      <RefreshCwIcon aria-hidden={true} className="size-3" />
                      {refreshingCheckoutId === checkout.id
                        ? 'Refreshing…'
                        : WORKSPACE_FOLDERS_COPY.refreshButton}
                    </Button>
                  </Form>
                  <Form method="post">
                    <input
                      name="intent"
                      type="hidden"
                      value="applyEditorConfig"
                    />
                    <input
                      name="repositoryId"
                      type="hidden"
                      value={checkout.id}
                    />
                    <Button size="sm" type="submit" variant="outline">
                      {WORKSPACE_FOLDERS_COPY.applyEditorConfigButton}
                    </Button>
                  </Form>
                  <Form method="post">
                    <input name="intent" type="hidden" value="deleteRepo" />
                    <input name="id" type="hidden" value={checkout.id} />
                    <Button size="sm" type="submit" variant="ghost">
                      {WORKSPACE_FOLDERS_COPY.removeButton}
                    </Button>
                  </Form>
                </div>
              </li>
            );
          })}
        </ul>
      </CardContent>
    </Card>
  );
};
