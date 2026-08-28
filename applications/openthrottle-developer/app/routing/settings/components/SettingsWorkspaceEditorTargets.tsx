import * as React from 'react';
import clsx from 'clsx';
import { Form, Link, useNavigation } from 'react-router';
import {
  Badge,
  Button,
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
import { WORKSPACE_SETTINGS_COPY } from '~/routing/settings/data/data.copy';
import type { WorkspaceEditorTargetGroup } from '~/routing/settings/utils/workspace-editor-targets';

/** How many repositories render before the list collapses behind a show-all toggle. */
const COLLAPSED_TARGET_COUNT = 6;

export interface SettingsWorkspaceEditorTargetsProps {
  className?: string;
  hasRepositories: boolean;
  targets: readonly WorkspaceEditorTargetGroup[];
}

/**
 * @description Previews the repositories an apply-editor-configuration run writes to, one row
 * per repository with the enabled editors as badges and a single per-repo Apply action.
 */
export const SettingsWorkspaceEditorTargets = (
  props: SettingsWorkspaceEditorTargetsProps,
): React.ReactElement => {
  const { className, hasRepositories, targets } = props;

  // Hooks
  const navigation = useNavigation();
  const [showAll, setShowAll] = React.useState(false);

  // Setup
  const applyingRepositoryId =
    navigation.state === 'submitting' &&
    navigation.formData?.get('intent') === 'applyEditorConfig'
      ? navigation.formData.get('repositoryId')
      : null;
  const isCollapsible = targets.length > COLLAPSED_TARGET_COUNT;
  const visibleTargets =
    isCollapsible && !showAll
      ? targets.slice(0, COLLAPSED_TARGET_COUNT)
      : targets;

  // Handlers
  const handleToggleShowAll = (): void => {
    setShowAll((previous) => !previous);
  };

  // Markup

  // Life Cycle

  // 🔌 Short Circuit
  if (targets.length === 0) {
    return (
      <Empty
        className={clsx(className)}
        data-testid="SettingsWorkspaceEditorTargets"
      >
        <EmptyHeader>
          <EmptyTitle>{WORKSPACE_SETTINGS_COPY.targetsEmptyTitle}</EmptyTitle>
          <EmptyDescription>
            {hasRepositories
              ? WORKSPACE_SETTINGS_COPY.targetsNoEditors
              : WORKSPACE_SETTINGS_COPY.targetsNoRepositories}
          </EmptyDescription>
        </EmptyHeader>
        {hasRepositories ? null : (
          <Button asChild={true} variant="outline">
            <Link to="/settings/repositories">
              {WORKSPACE_SETTINGS_COPY.targetsAddRepositoryLink}
            </Link>
          </Button>
        )}
      </Empty>
    );
  }

  return (
    <div
      className={clsx('space-y-2', className)}
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
        <TableBody>
          {visibleTargets.map((target) => (
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
                <div className="flex flex-wrap gap-1">
                  {target.editors.map((editor) => (
                    <Badge key={editor.id} variant="secondary">
                      {editor.label}
                    </Badge>
                  ))}
                </div>
              </TableCell>
              <TableCell className="text-right">
                <Form className="inline-flex" method="post">
                  <input
                    name="intent"
                    type="hidden"
                    value="applyEditorConfig"
                  />
                  <input name="repositoryId" type="hidden" value={target.id} />
                  <Button
                    disabled={applyingRepositoryId === target.id}
                    size="xs"
                    type="submit"
                    variant="outline"
                  >
                    {applyingRepositoryId === target.id
                      ? WORKSPACE_SETTINGS_COPY.applyBusyLabel
                      : WORKSPACE_SETTINGS_COPY.applyRowButton}
                  </Button>
                </Form>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      {isCollapsible ? (
        <Button
          onClick={handleToggleShowAll}
          size="sm"
          type="button"
          variant="ghost"
        >
          {showAll ? (
            WORKSPACE_SETTINGS_COPY.targetsShowFewer
          ) : (
            <>
              {WORKSPACE_SETTINGS_COPY.targetsShowAllPrefix}
              {targets.length}
              {WORKSPACE_SETTINGS_COPY.targetsShowAllSuffix}
            </>
          )}
        </Button>
      ) : null}
    </div>
  );
};
