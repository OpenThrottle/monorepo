import * as React from 'react';
import { Form } from 'react-router';
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@openthrottle/react-router-shadcn';
import { CheckCircle2Icon } from 'lucide-react';
import type { AddWorkspaceFolderMutation } from '~/__generated__/graphql';
import { WORKSPACE_FOLDERS_COPY } from '~/routing/settings/data/data.copy';
import { deriveCheckoutInspectionBadges } from '~/routing/settings/repositories/utils/checkout-inspection-badges';

export interface AddFolderResultProps {
  payload: AddWorkspaceFolderMutation['addWorkspaceFolder'];
}

export const AddFolderResult = (
  props: AddFolderResultProps,
): React.ReactElement => {
  const { payload } = props;
  const { checkout, project, projectCreated, repository } = payload;

  // Hooks

  // Setup
  const inspection = checkout.inspection ?? null;
  const { detectedAgentConfig, detectedStack } =
    deriveCheckoutInspectionBadges(inspection);

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <Card data-testid="AddFolderResult">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <CheckCircle2Icon aria-hidden={true} className="size-4" />
          Added {checkout.displayName}
        </CardTitle>
        <CardDescription className="font-mono text-xs">
          {checkout.filesystemPath}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <dl className="space-y-1">
          <div className="flex gap-2">
            <dt className="text-muted-foreground w-24 shrink-0">Remote</dt>
            <dd className="truncate font-mono text-xs leading-5">
              {repository.normalizedRemoteUrl ?? 'None detected (local only)'}
            </dd>
          </div>
          <div className="flex gap-2">
            <dt className="text-muted-foreground w-24 shrink-0">Branch</dt>
            <dd>
              {inspection?.git.currentBranch ??
                repository.defaultBranch ??
                'Unknown'}
            </dd>
          </div>
          {detectedStack.length > 0 ? (
            <div className="flex gap-2">
              <dt className="text-muted-foreground w-24 shrink-0">Stack</dt>
              <dd className="flex flex-wrap gap-1">
                {detectedStack.map((item) => (
                  <Badge key={item} variant="outline">
                    {item}
                  </Badge>
                ))}
              </dd>
            </div>
          ) : null}
          {detectedAgentConfig.length > 0 ? (
            <div className="flex gap-2">
              <dt className="text-muted-foreground w-24 shrink-0">
                Agent config
              </dt>
              <dd className="flex flex-wrap gap-1">
                {detectedAgentConfig.map((item) => (
                  <Badge key={item} variant="outline">
                    {item}
                  </Badge>
                ))}
              </dd>
            </div>
          ) : null}
        </dl>

        {project ? (
          <p>
            {WORKSPACE_FOLDERS_COPY.projectLinkedPrefix}{' '}
            <span className="font-medium">{project.name}</span>{' '}
            {projectCreated
              ? WORKSPACE_FOLDERS_COPY.projectCreatedSuffix
              : null}
          </p>
        ) : null}

        <Form method="post">
          <input name="intent" type="hidden" value="applyEditorConfig" />
          <input name="repositoryId" type="hidden" value={checkout.id} />
          <Button size="sm" type="submit" variant="outline">
            {WORKSPACE_FOLDERS_COPY.applyEditorConfigButton}
          </Button>
        </Form>
      </CardContent>
    </Card>
  );
};
