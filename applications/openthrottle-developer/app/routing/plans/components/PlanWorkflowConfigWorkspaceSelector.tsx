import * as React from 'react';
import {
  Label,
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@openthrottle/react-router-shadcn';
import { GitBranch } from 'lucide-react';
import { OpenThrottleFieldset } from '@openthrottle/react-router-ui';
import type { PlanRunConfigRepositoryFieldsFragment } from '~/__generated__/graphql';
import { PlanWorkflowConfigWorkspace } from '~/routing/plans/components/PlanWorkflowConfigWorkspace';
import { usePlanWorkflowConfigWorkspaceSelector } from '~/routing/plans/hooks/usePlanWorkflowConfigWorkspaceSelector';
import {
  basename,
  CHECKOUT_PREFIX,
  CUSTOM_VALUE,
  REPOSITORY_PREFIX,
  ROOT_VALUE,
} from '~/routing/plans/utils/plan-workflow-config-workspace-selector';

export interface PlanWorkflowConfigWorkspaceSelectorProps {
  readonly checkoutId: string;
  readonly heading: string;
  readonly onCheckoutIdChange: (checkoutId: string) => void;
  readonly onRepositoryIdChange: (repositoryId: string) => void;
  readonly onWorkingDirectoryChange: (path: string) => void;
  readonly planProjectId?: string | null;
  readonly repositories: readonly PlanRunConfigRepositoryFieldsFragment[];
  readonly repositoryId: string;
  readonly workingDirectory: string;
}

/**
 * @description Primary "Workspace" run-config control: pick a registered checkout
 * (highest precedence) or a repository (portable — resolved to the enqueuing user's
 * single checkout), with a raw absolute-path escape hatch under "Custom path" and
 * the monorepo root as the default. Mirrors the enqueue resolution order
 * checkoutId → repositoryId → workingDirectory.
 */
export const PlanWorkflowConfigWorkspaceSelector = (
  props: PlanWorkflowConfigWorkspaceSelectorProps,
): React.ReactElement => {
  const {
    checkoutId,
    heading,
    onCheckoutIdChange,
    onRepositoryIdChange,
    onWorkingDirectoryChange,
    planProjectId,
    repositories,
    repositoryId,
    workingDirectory,
  } = props;

  // Hooks
  const { handleValueChange, selectedCheckout, selectedValue } =
    usePlanWorkflowConfigWorkspaceSelector({
      checkoutId,
      onCheckoutIdChange,
      onRepositoryIdChange,
      onWorkingDirectoryChange,
      planProjectId,
      repositories,
      repositoryId,
      workingDirectory,
    });

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <OpenThrottleFieldset
      className="border-0"
      id="workflow-run-workspace-legend"
      legend={heading}
    >
      <p className="text-muted-foreground text-xs">
        Choose a registered repository or checkout to run in — OpenThrottle
        resolves it to a filesystem path on enqueue. Pick a specific{' '}
        <strong>checkout</strong>, or a <strong>repository</strong> to use your
        single checkout of it. Use <strong>Custom path</strong> for an
        unregistered directory, or <strong>Monorepo root</strong> for the
        default.
      </p>

      <div className="space-y-2">
        <Label htmlFor="workflow-run-workspace-select">Workspace</Label>
        <Select onValueChange={handleValueChange} value={selectedValue}>
          <SelectTrigger
            className="w-full"
            data-testid="workflow-run-workspace-select"
            id="workflow-run-workspace-select"
          >
            <SelectValue placeholder="Monorepo root (default)" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ROOT_VALUE}>Monorepo root (default)</SelectItem>
            {repositories.map((repo) => (
              <SelectGroup key={repo.id}>
                <SelectLabel>{repo.name}</SelectLabel>
                <SelectItem value={`${REPOSITORY_PREFIX}${repo.id}`}>
                  Any of my checkouts
                </SelectItem>
                {repo.checkouts.map((checkout) => (
                  <SelectItem
                    key={checkout.id}
                    value={`${CHECKOUT_PREFIX}${checkout.id}`}
                  >
                    {checkout.displayName || basename(checkout.filesystemPath)}
                    {checkout.inspection?.git?.currentBranch
                      ? ` · ${checkout.inspection.git.currentBranch}`
                      : ''}
                  </SelectItem>
                ))}
              </SelectGroup>
            ))}
            <SelectItem value={CUSTOM_VALUE}>Custom path…</SelectItem>
          </SelectContent>
        </Select>

        {selectedCheckout != null ? (
          <p className="text-muted-foreground flex items-center gap-1.5 text-xs">
            <GitBranch aria-hidden={true} className="size-3.5 shrink-0" />
            <span className="truncate font-mono">
              {selectedCheckout.filesystemPath}
            </span>
          </p>
        ) : repositoryId !== '' ? (
          <p className="text-muted-foreground text-xs">
            Resolves to your checkout of this repository on enqueue — errors if
            you have none, or more than one.
          </p>
        ) : null}
      </div>

      {selectedValue === CUSTOM_VALUE ? (
        <PlanWorkflowConfigWorkspace
          heading="Custom path"
          onChange={onWorkingDirectoryChange}
          value={workingDirectory}
        />
      ) : null}
    </OpenThrottleFieldset>
  );
};
