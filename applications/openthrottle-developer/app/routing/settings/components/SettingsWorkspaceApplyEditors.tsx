import * as React from 'react';
import classnames from 'classnames';
import { Form, useNavigation } from 'react-router';
import { Button } from '@openthrottle/react-router-shadcn';

export interface SettingsWorkspaceApplyEditorsProps {
  actionError?: string | null;
  actionMessage?: string | null;
  className?: string;
  disabled?: boolean;
}

/**
 * @description Triggers server-side application of enabled editor config to linked repos.
 */
export const SettingsWorkspaceApplyEditors = (
  props: SettingsWorkspaceApplyEditorsProps,
): React.ReactElement => {
  const { actionError, actionMessage, className, disabled } = props;

  // Hooks
  const navigation = useNavigation();
  const isSubmitting =
    navigation.state === 'submitting' &&
    navigation.formData?.get('intent') === 'applyEditorConfig';

  // Setup

  // Handlers

  // Markup

  // Life Cycle

  // 🔌 Short Circuit

  return (
    <div
      className={classnames(
        'flex flex-col gap-2 sm:flex-row sm:items-center',
        className,
      )}
      data-testid="SettingsWorkspaceApplyEditors"
    >
      <Form method="post">
        <input name="intent" type="hidden" value="applyEditorConfig" />
        <Button
          disabled={disabled || isSubmitting}
          type="submit"
          variant="secondary"
        >
          {isSubmitting ? 'Applying…' : 'Apply editor configuration'}
        </Button>
      </Form>
      {actionMessage ? (
        <p className="text-muted-foreground text-sm" role="status">
          {actionMessage}
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
