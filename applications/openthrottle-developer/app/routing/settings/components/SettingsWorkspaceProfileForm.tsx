import * as React from 'react';
import clsx from 'clsx';
import { Button, Input, Label } from '@openthrottle/react-router-shadcn';
import { UserRoundIcon } from 'lucide-react';
import { Form, useNavigation } from 'react-router';
import { OpenThrottleFieldset } from '@openthrottle/react-router-ui';
import { WORKSPACE_SETTINGS_COPY } from '~/routing/settings/data/data.copy';
import type { UserWorkspaceProfileFieldsFragment } from '~/__generated__/graphql';

export interface SettingsWorkspaceProfileFormProps {
  actionError?: string | null;
  className?: string;
  profile: UserWorkspaceProfileFieldsFragment;
}

/**
 * @description Secondary contact fieldset. Posts the enabled editors alongside the contact values
 * so the shared `updateProfile` intent never has to tolerate a partial payload.
 */
export const SettingsWorkspaceProfileForm = (
  props: SettingsWorkspaceProfileFormProps,
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
      icon={UserRoundIcon}
      id="settings-workspace-profile-form"
      legend={WORKSPACE_SETTINGS_COPY.contactLegend}
    >
      <div
        className={clsx('space-y-4', className)}
        data-testid="SettingsWorkspaceProfileForm"
      >
        <p className="text-muted-foreground text-sm">
          {WORKSPACE_SETTINGS_COPY.contactExplainer}
        </p>

        <Form className="space-y-4" method="post">
          <input name="intent" type="hidden" value="updateProfile" />
          {profile.enabledEditors.map((editor) => (
            <input
              key={editor}
              name="enabledEditors"
              type="hidden"
              value={editor}
            />
          ))}

          <div className="space-y-2">
            <Label htmlFor="workspace-contact-display-name">
              {WORKSPACE_SETTINGS_COPY.displayNameLabel}
            </Label>
            <Input
              defaultValue={profile.contactDisplayName ?? ''}
              id="workspace-contact-display-name"
              name="contactDisplayName"
              placeholder={WORKSPACE_SETTINGS_COPY.displayNamePlaceholder}
              type="text"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="workspace-contact-email">
              {WORKSPACE_SETTINGS_COPY.contactEmailLabel}
            </Label>
            <Input
              defaultValue={profile.contactEmail ?? ''}
              id="workspace-contact-email"
              name="contactEmail"
              placeholder={WORKSPACE_SETTINGS_COPY.contactEmailPlaceholder}
              type="email"
            />
          </div>

          {actionError ? (
            <p className="text-destructive text-sm" role="alert">
              {actionError}
            </p>
          ) : null}

          <Button disabled={isSubmitting} type="submit" variant="outline">
            {isSubmitting
              ? WORKSPACE_SETTINGS_COPY.saveBusyLabel
              : WORKSPACE_SETTINGS_COPY.saveButton}
          </Button>
        </Form>
      </div>
    </OpenThrottleFieldset>
  );
};
