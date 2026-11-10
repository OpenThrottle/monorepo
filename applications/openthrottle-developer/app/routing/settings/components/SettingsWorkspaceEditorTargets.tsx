import {
  Button,
  cn,
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@openthrottle/react-router-shadcn';
import * as React from 'react';
import { Form, Link, useNavigation } from 'react-router';

import type {
  EditorPresenceState,
  WorkspaceEditorId,
} from '~/__generated__/graphql';
import { WorkspaceEditorTargetEditors } from '~/routing/settings/components/WorkspaceEditorTargetEditors';
import { WORKSPACE_SETTINGS_COPY } from '~/routing/settings/data/data.copy';
import type { WorkspaceEditorTargetGroup } from '~/routing/settings/utils/workspace-editor-targets';

/** How many repositories render before the list collapses behind a show-all toggle. */
const COLLAPSED_TARGET_COUNT = 6;

export interface SettingsWorkspaceEditorTargetsProps {
  className?: string;
  hasRepositories: boolean;
  /**
   * Advisory presence per editor, or null when the probe failed — the null path is the
   * loader's `.catch` and must render exactly as this table did before presence existed.
   * Display-only: a not-detected editor's Apply still runs, because writing editor config
   * into a repo is useful before the editor is installed.
   */
  presence?: ReadonlyMap<WorkspaceEditorId, EditorPresenceState> | null;
  targets: readonly WorkspaceEditorTargetGroup[];
}

/**
 * @description Previews the repositories an apply-editor-configuration run writes to, one row
 * per repository with the enabled editors as badges and a single per-repo Apply action.
 */
export const SettingsWorkspaceEditorTargets = (
  props: SettingsWorkspaceEditorTargetsProps,
): React.ReactElement => {
  const { className, hasRepositories, presence, targets } = props;

  // Hooks
  const navigation = useNavigation();
  const [showAll, setShowAll] = React.useState(false);

  // Setup
  const isApplying =
    navigation.state === 'submitting' &&
    navigation.formData?.get('intent') === 'applyEditorConfig';
  const submittedRepositoryId =
    navigation.formData?.get('repositoryId') ?? null;
  const applyingRepositoryId = isApplying ? submittedRepositoryId : null;
  const isCollapsible = targets.length > COLLAPSED_TARGET_COUNT;
  const isCapped = isCollapsible && !showAll;
  const collapsedTargets = targets.slice(0, COLLAPSED_TARGET_COUNT);
  const visibleTargets = isCapped ? collapsedTargets : targets;
  const {
    applyBusyLabel,
    applyRowButton,
    targetsNoEditors,
    targetsNoRepositories,
    targetsShowFewer,
  } = WORKSPACE_SETTINGS_COPY;
  const emptyCopy = hasRepositories ? targetsNoEditors : targetsNoRepositories;

  // Handlers
  const handleToggleShowAll = (): void => {
    setShowAll((previous) => !previous);
  };

  // Markup
  const addRepositoryButton = (
    <Button asChild={true} variant="outline">
      <Link prefetch="intent" to="/settings/repositories">
        {WORKSPACE_SETTINGS_COPY.targetsAddRepositoryLink}
      </Link>
    </Button>
  );
  const showAllLabel = (
    <>
      {WORKSPACE_SETTINGS_COPY.targetsShowAllPrefix}
      {targets.length}
      {WORKSPACE_SETTINGS_COPY.targetsShowAllSuffix}
    </>
  );
  const toggleButton = (
    <Button
      onClick={handleToggleShowAll}
      size="sm"
      type="button"
      variant="ghost"
    >
      {showAll ? targetsShowFewer : showAllLabel}
    </Button>
  );
  const targetRows = visibleTargets.map((target) => {
    const isApplyingRow = applyingRepositoryId === target.id;
    const rowLabel = isApplyingRow ? applyBusyLabel : applyRowButton;

    return (
      <TableRow key={target.id}>
        <TableCell>
          <Link
            className="underline-offset-4 hover:underline"
            to={`/settings/repositories/${target.id}`}
          >
            {target.displayName}
          </Link>
        </TableCell>
        <TableCell className="text-muted-foreground font-mono text-xs">
          {target.filesystemPath}
        </TableCell>
        <TableCell>
          <WorkspaceEditorTargetEditors
            editors={target.editors}
            presence={presence}
          />
        </TableCell>
        <TableCell className="text-right">
          <Form className="inline-flex" method="post">
            <input name="intent" type="hidden" value="applyEditorConfig" />
            <input name="repositoryId" type="hidden" value={target.id} />
            <Button
              disabled={isApplyingRow}
              size="xs"
              type="submit"
              variant="outline"
            >
              {rowLabel}
            </Button>
          </Form>
        </TableCell>
      </TableRow>
    );
  });

  // Life Cycle

  // 🔌 Short Circuit
  if (targets.length === 0) {
    return (
      <Empty
        className={cn(className)}
        data-testid="SettingsWorkspaceEditorTargets"
      >
        <EmptyHeader>
          <EmptyTitle>{WORKSPACE_SETTINGS_COPY.targetsEmptyTitle}</EmptyTitle>
          <EmptyDescription>{emptyCopy}</EmptyDescription>
        </EmptyHeader>
        {hasRepositories ? null : addRepositoryButton}
      </Empty>
    );
  }

  return (
    <div
      className={cn('space-y-2', className)}
      data-testid="SettingsWorkspaceEditorTargets"
    >
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>
              {WORKSPACE_SETTINGS_COPY.targetsColumnRepository}
            </TableHead>
            <TableHead>{WORKSPACE_SETTINGS_COPY.targetsColumnPath}</TableHead>
            <TableHead>
              {WORKSPACE_SETTINGS_COPY.targetsColumnEditors}
            </TableHead>
            <TableHead className="text-right">
              {WORKSPACE_SETTINGS_COPY.targetsColumnActions}
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>{targetRows}</TableBody>
      </Table>
      {isCollapsible ? toggleButton : null}
    </div>
  );
};
