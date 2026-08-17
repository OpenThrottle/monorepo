import * as React from 'react';
import clsx from 'clsx';
import { Form, useNavigation } from 'react-router';
import { Button } from '@openthrottle/react-router-shadcn';
import { WORKSPACE_SETTINGS_COPY } from '~/routing/settings/data/data.copy';

export interface SettingsWorkspaceApplyEditorsProps {
  actionError?: string | null;
  className?: string;
  disabled?: boolean;
}

/**
 * @description Triggers server-side application of enabled editor config to linked repos.
 */
export const SettingsWorkspaceApplyEditors = (
  props: SettingsWorkspaceApplyEditorsProps,
): React.ReactElement => {
  const { actionError, className, disabled } = props;

  // Hooks
  const navigation = useNavigation();
  const isSubmitting =
    navigation.state === 'submitting' &&
    navigation.formData?.get('intent') === 'applyEditorConfig' &&
    navigation.formData.get('repositoryId') === null;

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <div
      className={clsx(
        'flex flex-col gap-2 sm:flex-row sm:items-center',
        className,
      )}
      data-testid="SettingsWorkspaceApplyEditors"
    >
      <Form method="post">
        <input name="intent" type="hidden" value="applyEditorConfig" />
        <Button
          aria-describedby={
            disabled ? 'settings-workspace-apply-disabled-reason' : undefined
          }
          disabled={disabled || isSubmitting}
          type="submit"
          variant="secondary"
        >
          {isSubmitting
            ? WORKSPACE_SETTINGS_COPY.applyBusyLabel
            : WORKSPACE_SETTINGS_COPY.applyAllButton}
        </Button>
      </Form>
      {disabled ? (
        <p
          className="text-muted-foreground text-sm"
          id="settings-workspace-apply-disabled-reason"
        >
          {WORKSPACE_SETTINGS_COPY.applyDisabledReason}
        </p>
      ) : null}
      {actionError ? (
        <p className="text-destructive text-sm" role="alert">
          {actionError}
        </p>
      ) : null}
    </div>
  );
};
