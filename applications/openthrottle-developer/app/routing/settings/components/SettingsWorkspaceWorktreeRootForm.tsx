import * as React from 'react';
import clsx from 'clsx';
import { Button, Input, Label } from '@openthrottle/react-router-shadcn';
import { FolderTreeIcon } from 'lucide-react';
import { Form, useNavigation } from 'react-router';
import { OpenThrottleFieldset } from '@openthrottle/react-router-ui';
import { WORKSPACE_SETTINGS_COPY } from '~/routing/settings/data/data.copy';
import type { UserWorkspaceProfileFieldsFragment } from '~/__generated__/graphql';

export interface SettingsWorkspaceWorktreeRootFormProps {
  actionError?: string | null;
  className?: string;
  profile: UserWorkspaceProfileFieldsFragment;
}

/**
 * @description Workspace-wide worktree root. Posts the contact values and enabled editors
 * alongside the root so the shared `updateProfile` intent never has to tolerate a partial payload.
 */
export const SettingsWorkspaceWorktreeRootForm = (
  props: SettingsWorkspaceWorktreeRootFormProps,
): React.ReactElement => {
  const { actionError, className, profile } = props;

  // Hooks
  const navigation = useNavigation();

  // Setup
  const isSubmitting =
    navigation.state === 'submitting' &&
    navigation.formData?.get('intent') === 'updateProfile';

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <OpenThrottleFieldset
      icon={FolderTreeIcon}
      id="settings-workspace-worktree-root-form"
      legend={WORKSPACE_SETTINGS_COPY.worktreeRootLegend}
    >
      <div
        className={clsx('space-y-4', className)}
        data-testid="SettingsWorkspaceWorktreeRootForm"
      >
        <p className="text-muted-foreground text-sm">
          {WORKSPACE_SETTINGS_COPY.worktreeRootExplainer}
        </p>

        <Form className="space-y-4" method="post">
          <input name="intent" type="hidden" value="updateProfile" />
          <input
            name="contactDisplayName"
            type="hidden"
            value={profile.contactDisplayName ?? ''}
          />
          <input
            name="contactEmail"
            type="hidden"
            value={profile.contactEmail ?? ''}
          />
          {profile.enabledEditors.map((editor) => (
            <input
              key={editor}
              name="enabledEditors"
              type="hidden"
              value={editor}
            />
          ))}

          <div className="space-y-2">
            <Label htmlFor="workspace-worktree-root">
              {WORKSPACE_SETTINGS_COPY.worktreeRootLabel}
            </Label>
            <Input
              defaultValue={profile.worktreeRoot ?? ''}
              id="workspace-worktree-root"
              name="worktreeRoot"
              placeholder={WORKSPACE_SETTINGS_COPY.worktreeRootPlaceholder}
              type="text"
            />
            <p className="text-muted-foreground text-xs">
              {WORKSPACE_SETTINGS_COPY.worktreeRootHint}
            </p>
          </div>

          {actionError ? (
            <p className="text-destructive text-sm" role="alert">
              {actionError}
            </p>
          ) : null}

          <Button disabled={isSubmitting} type="submit" variant="outline">
            {isSubmitting
              ? WORKSPACE_SETTINGS_COPY.saveBusyLabel
              : WORKSPACE_SETTINGS_COPY.worktreeRootSaveButton}
          </Button>
        </Form>
      </div>
    </OpenThrottleFieldset>
  );
};
