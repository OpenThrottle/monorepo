import * as React from 'react';
import clsx from 'clsx';
import { Form, Link, useNavigation } from 'react-router';
import {
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
import type { WorkspaceEditorTarget } from '~/routing/settings/utils/workspace-editor-targets';

export interface SettingsWorkspaceEditorTargetsProps {
  className?: string;
  hasRepositories: boolean;
  targets: readonly WorkspaceEditorTarget[];
}

/**
 * @description Previews the repository/editor pairings an apply-editor-configuration run writes to.
 */
export const SettingsWorkspaceEditorTargets = (
  props: SettingsWorkspaceEditorTargetsProps,
): React.ReactElement => {
  const { className, hasRepositories, targets } = props;

  // Hooks
  const navigation = useNavigation();

  // Setup
  const applyingRepositoryId =
    navigation.state === 'submitting' &&
    navigation.formData?.get('intent') === 'applyEditorConfig'
      ? navigation.formData.get('repositoryId')
      : null;

  // Handlers

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
          <EmptyTitle>{WORKSPACE_SETTINGS_COPY.targetsHeading}</EmptyTitle>
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
      <p className="text-muted-foreground text-sm">
        {WORKSPACE_SETTINGS_COPY.targetsHeading}
      </p>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>
              {WORKSPACE_SETTINGS_COPY.targetsColumnRepository}
            </TableHead>
            <TableHead>{WORKSPACE_SETTINGS_COPY.targetsColumnPath}</TableHead>
            <TableHead>{WORKSPACE_SETTINGS_COPY.targetsColumnEditor}</TableHead>
            <TableHead>
              {WORKSPACE_SETTINGS_COPY.targetsColumnActions}
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {targets.map((target) => (
            <TableRow key={`${target.id}:${target.editor}`}>
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
              <TableCell>{target.editorLabel}</TableCell>
              <TableCell>
                <Form method="post">
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
    </div>
  );
};
